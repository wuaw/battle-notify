const debug = false
const AbnormalManager = tryRequire('./lib/abnormal')
const CooldownManager = tryRequire('./lib/cooldown')
const EntityManager = tryRequire('./lib/entity')
const PartyManager = tryRequire('./lib/party')
const Notify = tryRequire('./lib/notify')

for (const lib of [AbnormalManager, CooldownManager, EntityManager, PartyManager, Notify]){
    if(!lib) return
}

function tryRequire(path){
    delete require.cache[require.resolve(path)]
    const result = tryIt(() => require(path))
    if(result instanceof Error){
        logError([
            `[battle-notify] require: error loading (${path})`,
            result.stack
        ])
        return false
    }
    return result
}

function tryIt(func) {
    try {
        return func()
    } catch (e) {
        return e
    }
}
function logError(message) {
    console.error(Array.isArray(message) ? message.join('\n') : message)
}

module.exports = function BattleNotify(dispatch){
    let enabled = false
    const abMan = new AbnormalManager(dispatch, debug)
    const cooldown = new CooldownManager(dispatch, debug)
    const entities = new EntityManager(dispatch, debug)
    const party = new PartyManager(dispatch, debug)
    const notify = new Notify(dispatch, debug)
    const events = new Set()
    const conditions = {
        abnormal: {
            expiring: function(args){
                let timesToMatch = args.timeRemaining || 6
                if(typeof timesToMatch !== typeof []) timesToMatch = [timesToMatch]
                return function(info){
                    if(!info || !info.expires) return false
                    const remaining = Math.round((info.expires - Date.now())/1000)
                    if(timesToMatch.includes(remaining)) return (info.refreshed || info.added) + (remaining * 1000)
                }
            },
            added: function(args) {
                return function(info) { return (info ? info.added : false) }
            },
            addedorrefreshed: function(args){
                const requiredStacks = args.requiredStacks || 1
                return function(info) {
                    if(info && info.stacks < requiredStacks) return false
                    return (info ? (info.refreshed || info.added) : false)
                }
            },
            refreshed: function(args){
                const requiredStacks = args.requiredStacks || 1
                return function(info) {
                    if(info && info.stacks < requiredStacks) return false
                    return (info ? info.refreshed : false)
                }
            },
            removed: function(args){
                return function(info) { return (info ? info.removed : false) }
            },
            missing: function(args){
                const rewarnTimeout = (args.rewarnTimeout || 5)*1000
                return function(info, lastMatch) {
                    if(!info || (!info.added && !info.refreshed)){
                        if((lastMatch + rewarnTimeout) > Date.now()) return
                        return (Date.now())
                    }
                }
            },
            missingduringcombat: function(args){
                const rewarnTimeout = (args.rewarnTimeout || 5)*1000
                return function(info, lastMatch) {
                    if(!info || (!info.added && !info.refreshed)){
                        if((lastMatch + rewarnTimeout) > Date.now()) return
                        if(!entities.myEntity().combat) return
                        return Date.now()
                    }
                }
            }
        },
        cooldown: {
            expiring: function(args){
                let timesToMatch = args.timeRemaining || 6
                if(typeof timesToMatch !== typeof []) timesToMatch = [timesToMatch]
                return function(info){
                    if(!info || !info.expires) return false
                    const remaining = Math.round((info.expires - Date.now())/1000)
                    if(timesToMatch.includes(remaining)) return info.expires - remaining*1000
                }
            },
            expiringduringcombat(args){
                let timesToMatch = args.timeRemaining || 6
                if(typeof timesToMatch !== typeof []) timesToMatch = [timesToMatch]
                return function(info){
                    if(!info || !info.expires) return false
                    if(!entities.myEntity().combat) return false
                    if(!entities.myBoss().enraged) return false
                    const remaining = Math.round((info.expires - Date.now())/1000)
                    if(timesToMatch.includes(remaining)) return info.expires - remaining*1000
                }
            },
            expiringduringenrage(args){
                let timesToMatch = args.timeRemaining || 6
                if(typeof timesToMatch !== typeof []) timesToMatch = [timesToMatch]
                return function(info){
                    if(!info || !info.expires) return false
                    if(!entities.myEntity().combat) return false
                    const remaining = Math.round((info.expires - Date.now())/1000)
                    if(timesToMatch.includes(remaining)) return info.expires - remaining*1000
                }
            },
            ready: function(args){
                const rewarnTimeout = (args.rewarnTimeout || 5)*1000
                return function (info, lastMatch){
                    if((lastMatch + rewarnTimeout) > Date.now()) return
                    if(info && info.expires){
                        if(Date.now() < info.expires) return
                    }
                    return Date.now()
                }
            },
            readyduringcombat(args){
                const rewarnTimeout = (args.rewarnTimeout || 5)*1000
                return function (info, lastMatch){
                    if((lastMatch + rewarnTimeout) > Date.now()) return
                    if(info && info.expires){
                        if(Date.now() < info.expires) return
                    }
                    if(!entities.myEntity().combat) return
                    return Date.now()
                }
            },
            readyduringenrage(args){
                const rewarnTimeout = (args.rewarnTimeout || 5)*1000
                return function(info, lastMatch){
                    if((lastMatch + rewarnTimeout) > Date.now()) return
                    if(info && info.expires){
                        if(Date.now() < info.expires) return
                    }
                    if(!entities.myEntity().combat) return
                    if(!entities.myBoss().enraged) return
                    return Date.now()
                }
            }
        },
    }
    const generators = {
        targets: {
            self: function* (){
                yield entities.myCid()
            },
            myboss: function* (){
                yield entities.myBossId()
            },
            party: function* (){
                const myCid = entities.self().cid
                for (const cid of party.members()) if(cid !== myCid){
                    yield cid
                }
            },
            partyincludingself: function* (){
                for(const cid of party.members()){
                    yield cid
                }
            }
        },
        cooldown: function(skills, items) {
            return function* (){
                for(const skill of skills){
                    yield cooldown.skill(skill)
                }
                for(const item of items){
                    yield cooldown.item(item)
                }
            }
        }
    }

    dispatch.hook('S_LOGIN', 1, (event) => {
        enabled = true
        refreshConfig()
    })
    dispatch.hook('S_RETURN_TO_LOBBY', 'raw', (data) => {
        enabled = false
    })
    dispatch.hook('S_PRIVATE_CHAT', 1, (event) => {
        if(!debug) return
        enabled = true
        setTimeout(refreshConfig, 5)
    })

    function AbnormalEvent(data){
        if(typeof data.abnormalities !== typeof [])
            data.abnormalities = [data.abnormalities]
        const type = data.type.toLowerCase()
        const target = data.target.toLowerCase()
        const iterateTargets = generators.targets[target]
        const event = {}
        const args = event.args = {
            timeRemaining: data.time_remaining,
            rewarnTimeout: data.rewarn_timeout,
            requiredStacks: data.required_stacks
        }
        event.abnormalities = new Set(data.abnormalities)
        event.condition = conditions.abnormal[type](args)
        event.message = data.message
        event.lastMatches = new Map()
        event.matchAll = type.includes('missing')

        this.check = function(){
            for(const entityId of iterateTargets()){
                const result = tryIt(() => checkAbnormalEvent(entityId, event))
                if(result instanceof Error){
                    logError([
                        `[battle-notify] AbnormalEvent.check: error while checking event`,
                        `event: ${JSON.stringify(event)}`,
                        result.stack
                    ])
                }
            }
        }
    }
    function checkAbnormalEvent(entityId, event){
        if(!entityId) return
        const entity = entities.get(entityId)
        if(entity.dead) return

        entityId = entityId.toString()
        if(!event.lastMatches.has(entityId))
            event.lastMatches.set(entityId, 0)

        const results = new Set()
        let info
        let currentMatch

        for(const abnormal of event.abnormalities){
            const lastMatch = event.lastMatches.get(entityId)
            const abnormalInfo = abMan.get(entityId, abnormal)
            const match = event.condition(abnormalInfo, lastMatch)

            if(match && match !== lastMatch){
                currentMatch = match
                info = abnormalInfo
                results.add(true)
            } else results.add(false)
        }

        if(event.matchAll && results.has(false) || !results.has(true)) return
        notify.abnormal(event.message, entity, info)
        event.lastMatches.set(entityId, currentMatch)
    }

    function CooldownEvent(data){
        if(!data.skills)
            data.skills = []
        if(!data.items)
            data.items = []
        if(typeof data.skills !== typeof [])
            data.skills = [data.skills]
        if(typeof data.items !== typeof [])
            data.items = [data.items]
        const type = data.type.toLowerCase()
        const iterateTargets = generators.cooldown(data.skills, data.items)
        const event = {}
        const args = event.args = {
            timeRemaining: data.time_remaining,
            rewarnTimeout: data.rewarn_timeout
        }
        event.condition = conditions.cooldown[type](args)
        event.message = data.message
        event.lastMatches = new Map()

        this.check = function(){
            for (const info of iterateTargets()){
                const result = tryIt(() => checkCooldownEvent(info, event))
                if(result instanceof Error){
                    logError([
                        `[battle-notify] CooldownEvent.check: error while checking event`,
                        `event: ${JSON.stringify(event)}`,
                        result.stack
                    ])
                }
            }
        }
    }
    function checkCooldownEvent(info, event){
        const id = info.item ? info.item : info.skill
        if(!event.lastMatches.has(id))
            event.lastMatches.set(id, 0)

        const lastMatch = event.lastMatches.get(id)
        const match = event.condition(info, lastMatch)
        if(match && match !== lastMatch){
            notify.cooldown(event.message, info)
            event.lastMatches.set(id, match)
        }
    }

    function ResetEvent(data){
        if(typeof data.skills !== typeof []) data.skills = [data.skills]
        let groups = new Set()

        for(const skill of data.skills){
            groups.add(skillGroup(skill))
        }
        cooldown.onReset(groups, info => {
            notify.skillReset(data.message, info)
        })
        this.check = function(){

        }
    }

    function refreshConfig(){
        events.clear()
        cooldown.clearResetHooks()

        loadEvents('./config/' + entities.self().class)
        loadEvents('./config/common')

        loadStyling('./config/common_styling.js')
    }
    function loadStyling(path){
        const data = tryRequire(path)
        if(!data) return
        notify.setDefaults(data)
    }
    function loadEvent(event){
        let type
        if (event.abnormalities)
            type = AbnormalEvent
        else if (event.type && event.type.toLowerCase() === 'reset')
            type = ResetEvent
        else if (event.skills || event.items)
            type = CooldownEvent

        return new type(event)
    }
    function loadEvents(path){
        const data = tryRequire(path)
        if(!data) return

        for(const event of data){
            const result = tryIt(() => loadEvent(event))

            if(result instanceof Error){
                logError([
                    `[battle-notify] loadEvents: error while loading event from (${path})`,
                    `event: ${JSON.stringify(event)}`,
                    result.stack
                ])
                continue
            }
            events.add(result)
        }
    }
    function checkEvents(){
        if(!enabled) return
        for(const event of events){
            event.check()
        }
    }
    const checkTimer = setInterval(checkEvents, 500)
    this.destructor = function(){
        clearInterval(checkTimer)
    }
    if(debug) {
        dispatch.toServer('C_CHAT', 1, {"channel":11,"message":"<FONT></FONT>"})

        //notify.testColors()
    }
}
