module.exports = function CooldownManager(dispatch, debug){
    const skills = new Map()
    const items = new Map()
    const resetHooks = new Map()
    let model = 11001

    dispatch.hook('S_LOGIN', 1, (event) => {
        ({model} = event)
        skills.clear()
        items.clear()
    })
    dispatch.hook('S_START_COOLTIME_SKILL', 1, (event) => {
        const skill = event.skill - 0x4000000
        const expires = Date.now() + event.cooldown
        skills.set(skill, expires)
    })
    dispatch.hook('S_DECREASE_COOLTIME_SKILL', 1, (event) => {
        const skill = event.skill - 0x4000000
        const expires = Date.now() + event.cooldown
        skills.set(skill, expires)
    })
    dispatch.hook('S_START_COOLTIME_ITEM', 1, (event) => {
        items.set(event.item, Date.now() + event.cooldown*1000)
    })
    dispatch.hook('S_CREST_MESSAGE', 1, (event) => {
        if(event.type !== 6) return
        skills.set(event.skillID, Date.now())
        checkResetHooks(event.skillID)
    })
    function skillIcon(id){
        return `<img src='img://skill__0__${model}__${id}' width='48' height='48' vspace='-7' />`
    }
    function itemIcon(id){
        return `<img src='img://item__${id}' width='48' height='48' vspace='-7' />`
    }
    function checkResetHooks(skill){
        const group = Math.floor(skill / 10000)
        if(!resetHooks.has(group)) return
        for(const callback of resetHooks.get(group))
            callback({
                skill,
                icon: skillIcon(skill)
            })
    }
    this.clearResetHooks = function(){
        resetHooks.clear()
    }
    this.onReset = function(groups, callback){
        for(const group of groups){
            if(!resetHooks.has(group)) resetHooks.set(group, [])
            const hooks = resetHooks.get(group)
            hooks.push(callback)
        }
    }
    this.skill = function(id){
        return skills.get(id)
    }
    this.item = function(){
        return skills.get(id)
    }
}
