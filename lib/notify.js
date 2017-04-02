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
    let defaults = {
        chat: true,
        alert: true,
        notice: false,
        prepend: colorStr(colors['red'])
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
    function processTags(message){
        let msg = message
        let args = {}
        for(const [tag, raw] of tags(message)){
            let replace

            if(colors[tag]){
                replace = colorStr(colors[tag])
            }
            else if(tag.includes('#')){
                const hex = /#.{6}/g.exec(tag)
                replace = colorStr(hex)
            }
            else if(tag.includes('chat')){
                args.chat = true
                replace = ''
            }
            else if(tag.includes('notice')){
                args.notice = true
                replace = ''
            }
            else if(tag.includes('alert')){
                args.alert = true
                replace = ''
            }

            if(typeof replace === typeof undefined){
                console.warn(new Error(`[battle-notify] warning: unhandled or unknown tag "${raw}\nmessage: ${msg}`))
                replace = ''
            }
            message = message.replace(raw, replace)
        }
        return [message, args]
    }
    function notify (message){
        let [msg, args] = processTags(message)
        if(Object.keys(args).length === 0) args = defaults
        msg = defaults.prepend + msg

        if(args.chat) chat(msg)
        if(args.alert) alert(msg)
        if(args.notice) notice(msg)
    }
    function notice(message){
        dispatch.toClient('S_CHAT',1, {
              channel: 21,
              authorID: { high: 0, low: 0 },
              unk1: 0,
              gm: 0,
              unk2: 0,
              authorName: '',
              message: message,
        })
    }
    function chat(message){
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
    function alert(message){
        dispatch.toClient('S_DUNGEON_EVENT_MESSAGE', 1, {
            unk1: 2,
            unk2: 0,
            unk3: 0,
            message
        })
    }

    this.testColors = function(){
        let str = ''
        for(const name of Object.keys(colors)){
            if(str.length > 30) {
                notify(str)
                str = ''
            }
            str = str + `{${name}}${name} `
        }
        if(str !== '') notify(str)
    }
    this.setDefaults = function(str){
        if(!str) return
        const [message, args] = processTags(str)
        for(const key of Object.keys(defaults)){
            defaults[key] = args[key] ? args[key] : false
        }
        defaults.prepend = message
    }
    this.skillReset = function(message, info){
        if(info){
            message = message.replace('{icon}', info.icon)
        }
        notify(message)
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
        notify(message)
    }
    this.cooldown = function(message, info){
        if(info){
            message = message.replace('{duration}', duration(info.expires))
            message = message.replace('{icon}', info.icon)
        }
        notify(message)
    }
    this.notify = notify
}
