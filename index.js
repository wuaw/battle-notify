delete require.cache[require.resolve('./MonsterManager')]
delete require.cache[require.resolve('./AbnormalManager')]
delete require.cache[require.resolve('./PlayerManager')]
const MonsterManager = require('./MonsterManager')
const AbnormalManager = require('./AbnormalManager')
const PlayerManager = require('./PlayerManager')

module.exports = function BattleNotify(dispatch){
    const debug = false
    let common = {getEntity, clearEntity, lngCmp, getCid, debug}
    const monMan = new MonsterManager(dispatch, common)
    const abMan = new AbnormalManager(dispatch, common)
    const playerMan = new PlayerManager(dispatch, common)
    let events = []
    let entities = {}
    let enabled = false
    const targets = {
        self: function(cb){
            return cb(getCid())
        },
        myboss: function(cb) {
            return cb(monMan.getMyBoss())
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
                    if(!playerMan.getCombat()) return
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
                    // for "missing" types, we need all abnormalities to be missing
                    doNotify(info)
                    lastMatch = _lastMatch
                }
            } else if (results.includes(true)){
                //if one abnormality matched
                doNotify(info)
                lastMatch = _lastMatch
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
        enabled = true
        refreshConfig()
    })
    dispatch.hook('S_RETURN_TO_LOBBY', 'raw', (data) => {
        enabled = false
    })
    dispatch.hook('S_PRIVATE_CHAT', 1, (event) => {
        if(!debug) return
        enabled = true
        setTimeout(refreshConfig, 50)
    })
    dispatch.hook('S_CLEAR_ALL_HOLDED_ABNORMALITY', 'raw', (data) => {
        for(id in entities){
            entities[id].abnormals = {}
        }
        monMan.clear()
    })
    function notify(message){
        dispatch.toClient('S_DUNGEON_EVENT_MESSAGE', 1, {
            unk1: 2,
            unk2: 0,
            unk3: 0,
            message
        })
        dispatch.toClient('S_CHAT',1, {
              channel: 203,
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
        delete require.cache[require.resolve('./config/' + playerMan.getClass())]
        loadEvents(require('./config/common'))
        loadEvents(require('./config/' + playerMan.getClass()))
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
    function createEvent(abnormals, _target, type, message, arg){
        events.push(new AbnormalEvent(abnormals, _target, type, message, arg))
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
    function getCid(){
        return playerMan.getCid()
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
    if(debug) dispatch.toServer('C_CHAT', 1, {"channel":11,"message":"<FONT></FONT>"})
}
