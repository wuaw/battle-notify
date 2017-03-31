const debug = false
if(debug){
    delete require.cache[require.resolve('./lib/abnormal')]
    delete require.cache[require.resolve('./lib/cooldown')]
    delete require.cache[require.resolve('./lib/entity')]
    delete require.cache[require.resolve('./lib/party')]
    delete require.cache[require.resolve('./lib/notify')]
}

const AbnormalManager = require('./lib/abnormal')
const CooldownManager = require('./lib/cooldown')
const EntityManager = require('./lib/entity')
const PartyManager = require('./lib/party')
const Notify = require('./lib/notify')

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
                    let remaining = Math.round((info.expires - Date.now())/1000)
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
                    if(!info || (info && info.removed)){
                        if((lastMatch + rewarnTimeout) > Date.now()) return
                        return (Date.now())
                    }
                }
            },
            missingduringcombat: function(args){
                const rewarnTimeout = (args.rewarnTimeout || 5)*1000
                return function(info, lastMatch) {
                    if(!info || (info && info.removed)){
                        if((lastMatch + rewarnTimeout) > Date.now()) return
                        if(!entities.myEntity().combat) return
                        return Date.now()
                    }
                }
            }
        },
        cooldown: {
            expriring: function(args){

            }
        },
        targets: {
            self: function(cb){
                cb(entities.self().cid)
            },
            myboss: function(cb) {
                cb(entities.myBoss())
            },
            partyincludingself: function(cb) {
                for(const cid of party.members()){
                    cb(cid)
                }
            },
            party: function(cb){
                const myCid = entities.self().cid
                for(const cid of party.members()) if(cid !== myCid) {
                    cb(cid)
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

    function AbnormalEvent(abnormals, target, type, message, args){
        const iterateTargets = conditions.targets[target]
        const condition = conditions.abnormal[type](args)
        const lastMatches = new Map()

        function checkEntity(id){
            if(!id) return
            const entity = entities.get(id)
            if(entity.dead) return
            id = id.toString()
            if(!lastMatches.has(id)) lastMatches.set(id, 0)
            const results = new Set()

            let info
            let lastMatch = lastMatches.get(id)

            for(const abnormal of abnormals){
                const match = condition(abMan.get(id, abnormal), lastMatches.get(id))
                if(match && match !== lastMatches.get(id)){
                    lastMatch = match
                    info = abMan.get(id, abnormal)
                    results.add(true)
                } else results.add(false)
            }

            if(type.includes('missing') && results.has(false) || !results.has(true)) return

            notify.abnormal(message, entity, info)
            lastMatches.set(id, lastMatch)
        }
        this.check = function(){
            iterateTargets(checkEntity)
        }
    }

    function CooldownEvent(groups, type, message, args){
        // nyi
    }

    function createAbnormalEvent(abnormals, target, type, message, arg){
        if(typeof abnormals !== typeof []) abnormals = [abnormals]
        type = type.toLowerCase()
        target = target.toLowerCase()

        events.add(new AbnormalEvent(abnormals, target, type, message, arg))
    }
    function createCooldownEvent(skills, type, message, args){

    }
    function createResetEvent(skills, message, args){
        if(typeof skills !== typeof []) skills = [skills]
        let groups = new Set()

        for(const skill of skills){
            groups.add(Math.floor(skill / 10000))
        }
        cooldown.onReset(groups, (info) => {
            notify.skillReset(message, info)
        })
    }
    function refreshConfig(){
        events.clear()
        cooldown.clearResetHooks()
        delete require.cache[require.resolve('./config/common')]
        delete require.cache[require.resolve('./config/' + entities.self().class)]
        loadEvents(require('./config/common'))
        loadEvents(require('./config/' + entities.self().class))
    }
    function loadEvents(events){
        for(const event of events){
            if(event.abnormalities){
                createAbnormalEvent(
                    event.abnormalities,
                    event.target,
                    event.type,
                    event.message,
                    {
                        timeRemaining: event.time_remaining,
                        rewarnTimeout: event.rewarn_timeout,
                        requiredStacks: event.required_stacks
                    }
                )
                continue
            }
            if(event.type && event.type.toLowerCase() === 'reset'){
                createResetEvent(
                    event.skills,
                    event.message,
                    {}
                )
                continue
            }
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
    if(debug) dispatch.toServer('C_CHAT', 1, {"channel":11,"message":"<FONT></FONT>"})
}
