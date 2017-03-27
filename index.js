const Slash = require('slash')
const ID_ENRAGE = 8888888
let cid = {}
let entities = {}
let combat = false
let myBoss

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
        if(event.target === myBoss) myBoss = null
        clearEntity(event.target)
    })
    this.clear = function(){
        myBoss = null
        bosses = []
    }
}

function AbnormalManager(dispatch){
    let npcs = {}
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
    function getNpc(id){
        return npcs[id.toString()] = npcs[id.toString()] || {}
    }
    dispatch.hook('S_NPC_STATUS', 1, (event) => {
        if(lngCmp(event.target, 0)) return
        let npc = getNpc(event.creature)
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
            }
            npc.enraged = false
        }
    })
}

function PlayerManager(dispatch){
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
    const slash = new Slash(dispatch)
    const bossMan = new BossManager(dispatch)
    const abMan = new AbnormalManager(dispatch)
    const playerMan = new PlayerManager(dispatch)
    let events = []
    const targets = {
        self: function(cb){
            return cb(cid)
        },
        myboss: function(cb) {
            return cb(myBoss)
        }
    }

    const conditions = {
        expiring: function(seconds){
            return function(info){
                if(!info || !info.expires) return false
                let remaining = Math.round((info.expires - Date.now())/1000)
                if(remaining === seconds) return (info.refreshed || info.added)
            }
        },
        added: function() {
            return function(info) { return (info ? info.added : false) }
        },
        addedorrefreshed: function(){
            return function(info) { return (info ? (event.refreshed || info.added) : false) }
        },
        refreshed: function(){
            return function(info) { return (info ? info.refreshed : false) }
        },
        removed: function(){
            return function(info) { return (info ? info.removed : false) }
        },
        missing: function(rewarnTimeout){
            if(!rewarnTimeout) rewarnTimeout = 5
            rewarnTimeout *= 1000
            return function(info, lastMatch) {
                if(!info || (info && info.ended)){
                    if((lastMatch + rewarnTimeout) > Date.now()) return
                    return Date.now()
                }
            }
        },
        missingduringcombat: function(rewarnTimeout){
            if(!rewarnTimeout) rewarnTimeout = 5
            rewarnTimeout *= 1000
            return function(info, lastMatch) {
                if(!info || (info && info.ended)){
                    if((lastMatch + rewarnTimeout) > Date.now()) return
                    if(!combat) return
                    return Date.now()
                }
            }
        }
    }


    function AbnormalEvent(abnormals, _target, type, message, arg){
        if(typeof abnormals !== typeof []) abnormals = [abnormals]
        type = type.toLowerCase()
        _target = _target.toLowerCase()
        let doTargets = targets[_target]
        let condition = conditions[type](arg)
        let lastMatch = 0
        function checkEntity(id){
            const entity = getEntity(id)
            if(!entity) return false
            if(entity.dead) return
            let results = []
            let info
            abnormals.forEach(abnormal => {
                const match = condition(entity.abnormals[abnormal], lastMatch)
                if(match && match !== lastMatch){
                    lastMatch = match
                    results.push(true)
                    info = entity.abnormals[abnormal]
                } else results.push(false)
            })

            if(info) info.entity = entity

            if(type.includes('missing')){
                if(results.every(result => { return result }))
                    // for "missing" types, we need all abnormalities to be missing
                    doNotify(info)
            } else if (results.includes(true))
                //if one abnormality matched
                doNotify(info)
        }

        function doNotify(info){
            let _msg = message
            if(info){
                _msg = _msg.replace('{duration}', Math.round((info.expires - Date.now())/1000))
                _msg = _msg.replace('{name}', info.entity.name)
                if(info.entity.hp) _msg = _msg.replace('{hpminus10}',  info.entity.hp - 10)
            }
            notify(_msg)
        }

        this.check = function(){
            doTargets(checkEntity)
        }
    }

    function createEvent(abnormals, _target, type, message, arg){
        events.push(new AbnormalEvent(abnormals, _target, type, message, arg))
    }

    createEvent(ID_ENRAGE, 'MyBoss', 'added', 'Enrage {duration}s')
    createEvent(ID_ENRAGE, 'MyBoss', 'expiring', 'Enrage {duration}s', 12)
    createEvent(ID_ENRAGE, 'MyBoss', 'expiring', 'Enrage {duration}s', 6)
    createEvent(ID_ENRAGE, 'MyBoss', 'removed', 'Enrage Expired - Next {hpminus10}%')

    createEvent([701700, 701701], 'MyBoss', 'added', 'Contagion {duration}s')
    createEvent([701700, 701701], 'MyBoss', 'expiring', 'Contagion {duration}s', 6)
    createEvent([701700, 701701], 'MyBoss', 'removed', 'Contagion Expired')

    createEvent(60010, 'MyBoss', 'added', 'Hurricane {duration}s')
    createEvent(60010, 'MyBoss', 'expiring', 'Hurricane {duration}s', 6)
    createEvent(60010, 'MyBoss', 'removed', 'Hurricane Expired')


    dispatch.hook('S_LOGIN', 1, (event) => {
        ({cid} = event)
        let entity = getEntity(cid)
        entity.name = event.name
    })
/*
    // for debug
    dispatch.hook('S_PRIVATE_CHAT', 1, (event) => {
        cid = event.authorID
    })
*/
    dispatch.hook('S_CLEAR_ALL_HOLDED_ABNORMALITY', 'raw', (data) => {
        for(id in entities){
            entities[id].abnormals = {}
        }
    })

    dispatch.hook('S_LOAD_TOPO', 1, (event) => {
        bossMan.clear()
    })

    function notify(message){
        dispatch.toClient('S_DUNGEON_EVENT_MESSAGE', 1, {
            unk1: 2,
            unk2: 0,
            unk3: 0,
            message
        });
        dispatch.toClient('S_CHAT',1, {
              channel: 206,
              authorID: { high: 0, low: 0 },
              unk1: 0,
              gm: 0,
              unk2: 0,
              authorName: '',
              message: message,
        });
    }

    function checkEvents(){
        events.forEach(event => {
            event.check()
        })
    }
    const checkTimer = setInterval(checkEvents, 200)
    this.destructor = function(){
        clearInterval(checkTimer)
    }
}
