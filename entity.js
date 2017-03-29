const jobs = [
    'warrior',
    'lancer',
    'slayer',
    'berserker',
    'sorcerer',
    'archer',
    'priest',
    'mystic',
    'reaper',
    'gunner',
    'brawler',
    'ninja',
    'valkyrie'
]

module.exports = function EntityManager(dispatch, debug){
    let entities = {}
    let self = {
        cid: {},
        class: 'warrior',
        name: 'Default.Name'
    }
    dispatch.hook('S_BOSS_GAGE_INFO', 1, (event) => {
        let entity = getEntity(event.id)
        entity.boss = true
        if(!entity.name) entity.name = `{@Creature:${event.type}#${event.npc}}`
        let player = getEntity(self.cid)
        if(!player.target) player.target = event.id
    })
    dispatch.hook('S_EACH_SKILL_RESULT', 1, (event) => {
        let entity = getEntity(event.target)
        if(!entity.boss) return
        let player = getEntity(event.source)
        player.target = event.target
    })
    dispatch.hook('S_CREATURE_CHANGE_HP', 1, (event) => {
        let entity = getEntity(event.target)
        entity.hp = Math.floor((event.curHp / event.maxHp) * 100)
    })
    dispatch.hook('S_CREATURE_LIFE', 1, (event) => {
        let entity = getEntity(event.target)
        entity.dead = !event.alive
    })
    dispatch.hook('S_NPC_STATUS', 1, (event) => {
        let entity = getEntity(event.creature)
        if(event.enraged === 1)
            entity.enraged = true
        if(event.enraged === 0) {
            if(entity.enraged && entity.hp)
                entity.nextEnrage = entity.hp - 10
            entity.enraged = false
        }
    })
    dispatch.hook('S_DESPAWN_NPC', 1, (event) => {
        let entity = getEntity(event.target)
        if(event.type === 5 || event.type === 3) entity.dead = true
    })
    dispatch.hook('S_SPAWN_ME', 1, (event) => {
        let entity = getEntity(event.target)
        entity.dead = (event.alive === 0)
        entity.name = self.name
        entity.class = self.class
    })
    dispatch.hook('S_SPAWN_USER', 2, (event) => {
        let entity = getEntity(event.cid)
        let job = (event.model - 10101) % 100
        entity.name = event.name
        entity.class = jobs[job]
        entity.dead = (event.unk7 === 0)
    })
    dispatch.hook('S_USER_STATUS', 1, (event) => {
        let entity = getEntity(event.target)
        entity.combat = (event.status === 1)
    })
    dispatch.hook('S_LOGIN', 1, (event) => {
        let entity = getEntity(event.cid)
        let job = (event.model - 10101) % 100
        entity.name = event.name
        entity.class = jobs[job]

        self.cid = event.cid
        self.name = event.name
        self.class = jobs[job]
    })
    dispatch.hook('S_PRIVATE_CHAT', 1, (event) => {
        if(!debug) return
        self.cid = event.authorID
    })
    dispatch.hook('S_CLEAR_ALL_HOLDED_ABNORMALITY', 'raw', (data) => {
        entities = {}
    })
    function lngcmp(id1, id2){
        return (id1.toString() === id2.toString())
    }
    function getEntity(id){
        if(!id) return false
        id = id.toString()
        return entities[id] = entities[id] || {}
    }
    this.get = getEntity
    this.myEntity = function(){
        return getEntity(self.cid)
    }
    this.myBoss = function(){
        let entity = getEntity(self.cid)
        return entity.target
    }
    this.self = function(){
        return self
    }
}
