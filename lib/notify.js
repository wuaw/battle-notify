module.exports = function Notify(dispatch, debug){
    function duration(expires){
        return Math.round((expires - Date.now())/1000) + 's'
    }
    this.skillReset = function(message, info){
        if(info){
            message = message.replace('{icon}', info.icon)
        }
        this.notify(message)
    }
    this.abnormal = function(message, entity, info){
        if(info){
            message = message.replace('{duration}', duration(info.expires))
            message = message.replace('{stacks}', info.stacks)
        }
        if(entity && entity !== {}){
            message = message.replace('{name}', entity.name)
            message = message.replace('{nextEnrage}',  entity.nextEnrage + '%')
        }
        this.notify(message)
    }
    this.cooldown = function(message, info){
        if(info){
            message = message.replace('{duration}', duration(info.expires))
            message = message.replace('{icon}', info.icon)
        }
        this.notify(message)
    }
    this.notify = function(message){
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
}
