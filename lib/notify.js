module.exports = function Notify(dispatch, debug){
    const colors = {
        red: '#ee1c24',
        green: '#40fb40',
        blue: '#44ddff',

        darkblue: '#0196ff',
        lightblue: '#00ffff',

        violet: '#ff7eff',
        white: '#ffffff',
        yellow: '#ffcc00',
        orange: '#ff7d00',

        grey: '#c8c8b6',
        gray: '#c8c8b6'
    }

    function duration(expires){
        return Math.round((expires - Date.now())/1000) + 's'
    }
    function colorStr(hex){
        return `</FONT><FONT COLOR="${hex}">`
    }
    function* tags(message){
        const tags = message.match(/\{.*?\}/ig)
        if(!tags) return
        for(const raw of tags){
            const tag = raw.replace(RegExp(/[\{\}]/, 'g'), '')
            yield [tag, raw]
        }
    }
    function replaceColorTags(message){
        for(const [tag, raw] of tags(message)){
            if(colors[tag]){
                message = message.replace(raw, colorStr(colors[tag]))
            }
            if(tag.includes('#')){
                const hex = /#.{6}/g.exec(tag)
                message = message.replace(raw, colorStr(hex))
            }
        }
        return message
    }
    function style(message){
        message = replaceColorTags(message)
        return message
    }

    this.testColors = function(){
        for(const name of Object.keys(colors)){
            this.notify(`{${name}}${name}`)
        }
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
            message = message.replace('{icon}', info.icon)
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
        message = style(message)
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
