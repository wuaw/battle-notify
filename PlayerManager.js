module.exports = function PlayerManager(dispatch, common){
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
    let getEntity = common.getEntity
    let lngCmp = common.lngCmp
    let clearEntity = common.clearEntity
    let className
    let job
    let combat
    let name
    let cid
    dispatch.hook('S_SPAWN_ME', 1, (event) => {
        let entity = getEntity(event.target)
        entity.dead = (event.alive === 0)
    })
    dispatch.hook('S_SPAWN_USER', 2, (event) => {
        let entity = getEntity(event.cid)
        entity.dead = (event.unk7 === 0)
        entity.name = event.name
    })
    dispatch.hook('S_USER_STATUS', 1, (event) => {
        if(!lngCmp(cid, event.target)) return
        combat = (event.status === 1)
    })
    dispatch.hook('S_LOGIN', 1, (event) => {
        ({cid} = event)
        job = (event.model - 10101) % 100
        className = jobs[this.job]
        name = event.name
        let entity = getEntity(cid)
        entity.name = event.name
    })
    dispatch.hook('S_PRIVATE_CHAT', 1, (event) => {
        if(!debug) return
        cid = event.authorID
    })
    this.getCombat = function() { return combat }
    this.getClass = function() { return className }
    this.getJob = function() { return job }
    this.getName = function() { return name }
    this.getCid = function() { return cid }

    if(debug){
        job = 0
        className = jobs[job]
    }
}
