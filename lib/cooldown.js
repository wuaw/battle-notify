function tryIt(func) {
    try {
        return func();
    } catch (e) {
        return e;
    }
}
function logError(message) {
    console.error(Array.isArray(message) ? message.join('\n') : message);
}

let model = 11006
const skillId = x => x - 0x4000000
const skillGroup = x => Math.floor(x / 10000)
const skillIcon = id => `<img src='img://skill__0__${model}__${id}' width='48' height='48' vspace='-7' />`
const itemIcon = id => `<img src='img://item__${id}' width='48' height='48' vspace='-7' />`

module.exports = function CooldownManager(dispatch, debug){
    const skills = new Map()
    const items = new Map()
    const resetHooks = new Map()

    dispatch.hook('S_LOGIN', 1, (event) => {
        ({model} = event)
        skills.clear()
        items.clear()
    })
    dispatch.hook('S_START_COOLTIME_SKILL', 1, (event) => {
        const skill = getSkill(skillId(event.skill))
        skill.expires = Date.now() + event.cooldown
    })
    dispatch.hook('S_DECREASE_COOLTIME_SKILL', 1, (event) => {
        const skill = getSkill(skillId(event.skill))
        skill.expires = Date.now() + event.cooldown
    })
    dispatch.hook('S_START_COOLTIME_ITEM', 1, (event) => {
        const item = getItem(event.item)
        item.expires = Date.now() + event.cooldown*1000
    })
    dispatch.hook('S_CREST_MESSAGE', 1, (event) => {
        if(event.type !== 6) return
        const skill = getSkill(event.skillID)
        skill.expires = Date.now()
        skill.reset = Date.now()
        checkResetHooks(event.skillID)
    })
    function checkResetHooks(skill){
        const group = Math.floor(skill / 10000)
        if(!resetHooks.has(group)) return
        for(const callback of resetHooks.get(group)){
            const result = tryIt(() => callback({
                skill,
                icon: skillIcon(skill)
            }))
            if(result instanceof Error){
                logError([
                    `[battle-notify] checkResetHooks: error at callback`,
                    `skill: ${skill}, group: ${group}`,
                    result.stack
                ])
            }
        }
    }
    function getItem(id){
        if(!items.has(id)) items.set(id, {
            item: id,
            icon: itemIcon(id)
            //,name: `{@RawItem:${id}}`
        })
        return items.get(id)
    }
    function getSkill(id){
        const group = Math.floor(id / 10000)
        if(!skills.has(group)) skills.set(group, {
            skill: id,
            icon: skillIcon(id)
        })
        return skills.get(group)
    }
    this.clearResetHooks = () => resetHooks.clear()
    this.onReset = function(groups, callback){
        for(const group of groups){
            if(!resetHooks.has(group)) resetHooks.set(group, [])
            const hooks = resetHooks.get(group)
            hooks.push(callback)
        }
    }
    this.skill = getSkill
    this.item = getItem
}
