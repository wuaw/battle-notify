module.exports = function MonsterManager(dispatch, common){
    const getEntity = common.getEntity
    const lngCmp = common.lngCmp
    const getCid = common.getCid
    const debug = common.debug
    let bosses = []
    let myBoss
    dispatch.hook('S_BOSS_GAGE_INFO', 1, (event) => {
        if(!bosses.includes(event.id.toString()))
            bosses.push(event.id.toString())
        if(!myBoss) myBoss = event.id
        let entity = getEntity(event.id)
        if(!entity.name) entity.name = `{@Creature:${event.type}#${event.npc}}`
    })
    dispatch.hook('S_EACH_SKILL_RESULT', 1, (event) => {
        if(!lngCmp(event.source, getCid()) && !lngCmp(event.id0, getCid())) return
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
    function isBoss(id){
        return (bosses.includes(id.toString()))
    }
    this.clear = function(){
        myBoss = null
        bosses = []
    }
    this.getMyBoss = function() { return myBoss }
}
