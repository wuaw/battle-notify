const ID_ENRAGE = 8888888
const debug = false
let cid = {}
let entities = {}
let combat = false
let myBoss
let job

const jobs = [
    'warrior',
    'lancer',
    'slayer',
    'berserker',
    'sorcerer',
    'archer',
    'priest',
    'mystic',
    'reaper',
    'gunner',
    'brawler',
    'ninja',
    'valkyrie'
]

function BossManager(dispatch){
    let bosses = []
    function isBoss(id){
        return (bosses.includes(id.toString()))
    }
    dispatch.hook('S_BOSS_GAGE_INFO', 1, (event) => {
        if(!bosses.includes(event.id.toString()))
            bosses.push(event.id.toString())
        if(!myBoss) myBoss = event.id
        let entity = getEntity(event.id)
        if(!entity.name) entity.name = `{@Creature:${event.type}#${event.npc}}`
    })
    dispatch.hook('S_EACH_SKILL_RESULT', 1, (event) => {
        if(!lngCmp(event.source, cid) && !lngCmp(event.id0, cid)) return
        if(!isBoss(event.target)) return
        myBoss = event.target
    })
    dispatch.hook('S_CREATURE_CHANGE_HP', 1, (event) => {
        let entity = getEntity(event.target)
        entity.hp = Math.floor((event.curHp / event.maxHp) * 100)
    })
    dispatch.hook('S_CREATURE_LIFE', 1, (event) => {
        let entity = getEntity(event.target)
        entity.dead = !event.alive
    })
    dispatch.hook('S_DESPAWN_NPC', 1, (event) => {
        let entity = getEntity(event.target)
        if(event.type === 5 || event.type === 3) entity.dead = true
    })
    this.clear = function(){
        myBoss = null
        bosses = []
    }
}

function AbnormalManager(dispatch){
    let npcs = {}
    function getNpc(id){
        return npcs[id.toString()] = npcs[id.toString()] || {}
    }
    function addAbnormal(event){
        let entity = getEntity(event.target)
        let abnormal = entity.abnormals[event.id] = entity.abnormals[event.id] || {}
        abnormal.added = Date.now()
        abnormal.expires = Date.now() + event.duration
        delete abnormal.refreshed
        delete abnormal.removed
    }
    function refreshAbnormal(event){
        let entity = getEntity(event.target)
        let abnormal = entity.abnormals[event.id] = entity.abnormals[event.id] || {}
        if(!abnormal.added) abnormal.added = Date.now()
        abnormal.refreshed = Date.now()
        abnormal.expires = Date.now() + event.duration
    }
    function removeAbnormal(event){
        let entity = getEntity(event.target)
        let abnormal = entity.abnormals[event.id] = entity.abnormals[event.id] || {}
        abnormal.removed = Date.now()
        delete abnormal.added
        delete abnormal.refreshed
        delete abnormal.expires
    }
    dispatch.hook('S_ABNORMALITY_BEGIN', 1, addAbnormal)
    dispatch.hook('S_ABNORMALITY_REFRESH', 1, refreshAbnormal)
    dispatch.hook('S_ABNORMALITY_END', 1, removeAbnormal)
    dispatch.hook('S_NPC_STATUS', 1, (event) => {
        if(lngCmp(event.target, 0)) return
        let npc = getNpc(event.creature)
        let entity = getEntity(event.creature)
        if(event.enraged === 1) {
            if(!npc.enraged){
                addAbnormal({
                    target: event.creature,
                    source: {},
                    id: ID_ENRAGE,
                    duration: 36000,
                    stacks: 1
                })
            }
            npc.enraged = true
        }
        if(event.enraged === 0) {
            if(npc.enraged){
                removeAbnormal({
                    target: event.creature,
                    id: ID_ENRAGE
                })
                if(entity.hp){
                    entity.abnormals[ID_ENRAGE].nextEnrage = entity.hp - 10
                }
            }
            npc.enraged = false
        }
    })
}

function PlayerManager(dispatch){
    dispatch.hook('S_SPAWN_ME', 1, (event) => {
        let entity = getEntity(event.target)
        entity.dead = (event.alive === 0)
    })
    dispatch.hook('S_SPAWN_USER', 2, (event) => {
        let entity = getEntity(event.cid)
        entity.dead = (event.unk7 === 0)
    })
    dispatch.hook('S_USER_STATUS', 1, (event) => {
        if(!lngCmp(cid, event.target)) return
        combat = (event.status === 1)
    })
}

function lngCmp(id1, id2){
    return (id1.toString() === id2.toString())
}

function getEntity(id){
    if(!id) return false
    id = id.toString()
    return entities[id] = entities[id] || {abnormals: {}}
}
function clearEntity(id){
    if(!id) return false
    id = id.toString()
    let entity = getEntity(id)
    entity.abnormals = {}
}

module.exports = function BattleNotify(dispatch){
    const bossMan = new BossManager(dispatch)
    const abMan = new AbnormalManager(dispatch)
    const playerMan = new PlayerManager(dispatch)
    let events = []
    let enabled = true

    const targets = {
        self: function(cb){
            return cb(cid)
        },
        myboss: function(cb) {
            return cb(myBoss)
        }
    }
    const conditions = {
        expiring: function(args){
            let timesToMatch = args.timeRemaining || 6
            if(typeof timesToMatch !== typeof []) timesToMatch = [timesToMatch]
            return function(info){
                if(!info || !info.expires) return false
                let remaining = Math.round((info.expires - Date.now())/1000)
                if(timesToMatch.includes(remaining)) return (info.refreshed || info.added) + (remaining * 1000)
            }
        },
        added: function() {
            return function(info) { return (info ? info.added : false) }
        },
        addedorrefreshed: function(){
            return function(info) { return (info ? (info.refreshed || info.added) : false) }
        },
        refreshed: function(){
            return function(info) { return (info ? info.refreshed : false) }
        },
        removed: function(){
            return function(info) { return (info ? info.removed : false) }
        },
        missing: function(args){
            let rewarnTimeout = args.rewarnTimeout || 5
            rewarnTimeout *= 1000
            return function(info, lastMatch) {
                if(!info || (info && info.removed)){
                    if((lastMatch + rewarnTimeout) > Date.now()) return
                    return (Date.now())
                }
            }
        },
        missingduringcombat: function(args){
            let rewarnTimeout = args.rewarnTimeout || 5
            rewarnTimeout *= 1000
            return function(info, lastMatch) {
                if(!info || (info && info.removed)){
                    if((lastMatch + rewarnTimeout) > Date.now()) return
                    if(!combat) return
                    return Date.now()
                }
            }
        }
    }

    function AbnormalEvent(abnormals, _target, type, message, args){
        if(typeof abnormals !== typeof []) abnormals = [abnormals]
        type = type.toLowerCase()
        _target = _target.toLowerCase()
        let doTargets = targets[_target]
        let condition = conditions[type](args)
        let lastMatch = 0
        function checkEntity(id){
            const entity = getEntity(id)
            if(!entity) return false
            if(entity.dead) return
            let results = []
            let info
            let _lastMatch = lastMatch
            abnormals.forEach(abnormal => {
                const match = condition(entity.abnormals[abnormal], lastMatch)
                if(match && match !== lastMatch){
                    _lastMatch = match
                    results.push(true)
                    info = entity.abnormals[abnormal]
                } else results.push(false)
            })


            if(info) info.entity = entity

            if(type.includes('missing')){
                if(results.every(result => { return result })){
                    lastMatch = _lastMatch
                    // for "missing" types, we need all abnormalities to be missing
                    doNotify(info)
                }

            } else if (results.includes(true)){
                lastMatch = _lastMatch
                //if one abnormality matched
                doNotify(info)
            }
        }

        function doNotify(info){
            let _msg = message
            if(info){
                _msg = _msg.replace('{duration}', Math.round((info.expires - Date.now())/1000) + 's')
                _msg = _msg.replace('{name}', info.entity.name)
                if(info.nextEnrage) _msg = _msg.replace('{nextEnrage}',  info.nextEnrage + '%')
            }
            notify(_msg)
        }

        this.check = function(){
            doTargets(checkEntity)
        }
    }

    dispatch.hook('S_LOGIN', 1, (event) => {
        ({cid} = event)
        job = (event.model - 10101) % 100
        enabled = true
        let entity = getEntity(cid)
        entity.name = event.name
        refreshConfig()
    })

    dispatch.hook('S_RETURN_TO_LOBBY', 'raw', (data) => {
        enabled = false
    })

    dispatch.hook('S_PRIVATE_CHAT', 1, (event) => {
        if(!debug) return
        cid = event.authorID
    })
    if(debug) dispatch.toServer('C_CHAT', 1, {"channel":11,"message":"<FONT></FONT>"})

    dispatch.hook('S_CLEAR_ALL_HOLDED_ABNORMALITY', 'raw', (data) => {
        for(id in entities){
            entities[id].abnormals = {}
        }
        bossMan.clear()
    })

    function createEvent(abnormals, _target, type, message, arg){
        events.push(new AbnormalEvent(abnormals, _target, type, message, arg))
    }

    function notify(message){
        dispatch.toClient('S_DUNGEON_EVENT_MESSAGE', 1, {
            unk1: 2,
            unk2: 0,
            unk3: 0,
            message
        })
        dispatch.toClient('S_CHAT',1, {
              channel: 206,
              authorID: { high: 0, low: 0 },
              unk1: 0,
              gm: 0,
              unk2: 0,
              authorName: '',
              message: message,
        })
    }

    function refreshConfig(){
        events = []
        delete require.cache[require.resolve('./config/common')]
        delete require.cache[require.resolve('./config/' + jobs[job])]
        loadEvents(require('./config/common'))
        loadEvents(require('./config/' + jobs[job]))
    }
    function loadEvents(obj){
        obj.forEach(event => {
            createEvent(
                event.abnormalities,
                event.target,
                event.type,
                event.message,
                {
                    timeRemaining: event.time_remaining,
                    rewarnTimeout: event.rewarn_timeout
                }
            )
        })
    }


    if(debug) {
        job = 0
        refreshConfig()
    }
    function checkEvents(){
        if(!enabled) return
        events.forEach(event => {
            event.check()
        })
    }
    const checkTimer = setInterval(checkEvents, 500)
    this.destructor = function(){
        clearInterval(checkTimer)
    }
}
