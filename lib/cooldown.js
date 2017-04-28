let model = 11006
const isError = x => x instanceof Error
const skillId = x => x - 0x4000000
const skillGroup = x => Math.floor(x / 10000)
const skillIcon = id => `<img src='img://skill__0__${model}__${id}' width='48' height='48' vspace='-7' />`
const itemIcon = id => `<img src='img://item__${id}' width='48' height='48' vspace='-7' />`
const skills = new Map()
const items = new Map()
const resetHooks = new Map()

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

module.exports = function CooldownManager(dispatch, debug){
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
        if(event.type !== 6) return // skill reset
        const skill = getSkill(event.skillID)
        skill.expires = Date.now()
        skill.reset = Date.now()
        checkResetHooks(event.skillID)
    })

    function checkResetHooks(skill){
        const group = skillGroup(skill)
        const icon = skillIcon(skill)
        getHooks(group).map(tryIt)
            .filter(isError)
            .forEach(e => logError([
                `[battle-notify] checkResetHooks: error at callback`,
                `skill: ${skill}, group: ${group}`,
                e.stack
            ]))
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
        const group = skillGroup(id)
        if(!skills.has(group)) skills.set(group, {
            skill: id,
            icon: skillIcon(id)
        })
        return skills.get(group)
    }
    function getHooks(group){
        if(!resetHooks.has(group)) 
            resetHooks.set(group, [])
        return resetHooks.get(group)
    }

    this.clearResetHooks = () => resetHooks.clear()
    this.onReset = function(skills, cb){
        skills.map(id => ({
            group: skillGroup(id),
            info: {
                id,
                icon: skillIcon(id)
            }
        })).forEach(({group, info}) => 
            getHooks(group)
                .push(cb.bind(null, info))
        )
    }
    this.skill = getSkill
    this.item = getItem
}
