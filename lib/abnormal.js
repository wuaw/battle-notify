module.exports = function AbnormalManager(dispatch, debug){
    const ID_ENRAGE = 8888888
    const entities = new Map()
    dispatch.hook('S_ABNORMALITY_BEGIN', 1, addAbnormal)
    dispatch.hook('S_ABNORMALITY_REFRESH', 1, refreshAbnormal)
    dispatch.hook('S_ABNORMALITY_END', 1, removeAbnormal)
    dispatch.hook('S_LOAD_TOPO', 1, (event) => {
        entities.clear()
    })
    dispatch.hook('S_NPC_STATUS', 1, (event) => {
        const entity = getEntity(event.creature)
        if(event.enraged === 1) {
            if(!entity.get('enraged'))
                addAbnormal({
                    target: event.creature,
                    source: {},
                    id: ID_ENRAGE,
                    duration: 36000,
                    stacks: 1
                })
            entity.set('enraged', true)
        }
        if(event.enraged === 0) {
            if(entity.get('enraged'))
                removeAbnormal({
                    target: event.creature,
                    id: ID_ENRAGE
                })
            entity.set('enraged', false)
        }
    })
    function abnormalIcon(id){
        let icon
        if(id === ID_ENRAGE){
            icon = `<img src='img://item__8626' width='48' height='48' vspace='-7' />`
        } else {
            icon = `<img src='img://abonormality__${id}' width='48' height='48' vspace='-7' />`
        }
        return icon
    }
    function getEntity(id){
        if(!id) return false
        id = id.toString()
        if(!entities.has(id)) entities.set(id, new Map())
        return entities.get(id)
    }
    function getAbnormal(entityId, abnormalId){
        const entity = getEntity(entityId)
        if(!entity.has(abnormalId)) entity.set(abnormalId, {})
        const abnormal = entity.get(abnormalId)
        if(!abnormal.icon) abnormal.icon = abnormalIcon(abnormalId)
        return abnormal
    }
    function addAbnormal(event){
        const abnormal = getAbnormal(event.target, event.id)
        abnormal.added = Date.now()
        abnormal.expires = Date.now() + event.duration
        abnormal.stacks = event.stacks
        delete abnormal.refreshed
        delete abnormal.removed
    }
    function refreshAbnormal(event){
        const abnormal = getAbnormal(event.target, event.id)
        if(!abnormal.added) abnormal.added = Date.now()
        abnormal.stacks = event.stacks
        abnormal.refreshed = Date.now()
        abnormal.expires = Date.now() + event.duration
    }
    function removeAbnormal(event){
        const abnormal = getAbnormal(event.target, event.id)
        abnormal.removed = Date.now()
        delete abnormal.added
        delete abnormal.refreshed
        delete abnormal.expires
        delete abnormal.stacks
    }
    this.get = getAbnormal
}
