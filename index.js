const debug = false
if(debug){
    delete require.cache[require.resolve('./abnormal')]
    delete require.cache[require.resolve('./entity')]
    delete require.cache[require.resolve('./party')]
}

const AbnormalManager = require('./abnormal')
const EntityManager = require('./entity')
const PartyManager = require('./party')

module.exports = function BattleNotify(dispatch){
    const abMan = new AbnormalManager(dispatch, debug)
    const entities = new EntityManager(dispatch, debug)
    const party = new PartyManager(dispatch, debug)
    let events = []
    let enabled = false
    const targets = {
        self: function(cb){
            cb(entities.self().cid)
        },
        myboss: function(cb) {
            cb(entities.myBoss())
        },
        partyincludingself: function(cb) {
            party.members().forEach(cb)
        },
        party: function(cb){
            party.members().forEach(cid => {
                if(cid === entities.self().cid) return
                cb(cid)
            })
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
                    if(!entities.myEntity().combat) return
                    return Date.now()
                }
            }
        }
    }

    function AbnormalEvent(abnormals, target, type, message, args){
        if(typeof abnormals !== typeof []) abnormals = [abnormals]
        type = type.toLowerCase()
        target = target.toLowerCase()
        let doTargets = targets[target]
        let condition = conditions[type](args)
        let lastMatch = 0

        function checkEntity(id){
            const entity = entities.get(id)
            if(entity.dead) return
            let results = []
            let info
            let _lastMatch = lastMatch
            abnormals.forEach(abnormal => {
                const match = condition(abMan.get(id, abnormal), lastMatch)
                if(match && match !== lastMatch){
                    _lastMatch = match
                    info = abMan.get(id, abnormal)
                    results.push(true)
                } else results.push(false)
            })
            if(type.includes('missing')){
                if(results.every(result => { return result })){
                    // for "missing" types, we need all abnormalities to be missing
                    doNotify(entity, info)
                    lastMatch = _lastMatch
                }
            } else if (results.includes(true)){
                //if one abnormality matched
                doNotify(entity, info)
                lastMatch = _lastMatch
            }
        }
        function doNotify(entity, info){
            let _msg = message
            if(info){
                _msg = _msg.replace('{duration}', Math.round((info.expires - Date.now())/1000) + 's')
                _msg = _msg.replace('{stacks}', info.stacks)
            }
            if(entity && entity !== {}){
                _msg = _msg.replace('{name}', entity.name)
                _msg = _msg.replace('{nextEnrage}',  entity.nextEnrage + '%')
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
        setTimeout(refreshConfig, 5)
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
        delete require.cache[require.resolve('./config/' + entities.self().class)]
        loadEvents(require('./config/common'))
        loadEvents(require('./config/' + entities.self().class))
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
    function createEvent(abnormals, target, type, message, arg){
        events.push(new AbnormalEvent(abnormals, target, type, message, arg))
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
