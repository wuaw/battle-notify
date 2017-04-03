const party = new Map()

module.exports = function PartyManager(dispatch, debug){
    dispatch.hook('S_PARTY_MEMBER_LIST', 2, processPartyList)
    dispatch.hook('S_LEAVE_PARTY_MEMBER', 1, (event) => {
        party.delete(event.playerId.toString())
    })
    dispatch.hook('S_LEAVE_PARTY', 1, (event) => {
        party.clear()
    })
    function processPartyList(event) {
        party.clear()
        for(const member of event.members){
            party.set(
                member.playerId.toString(),
                member.cID.toString()
            )
        }
    }
    this.members = function(){
        return Array.from(party.values())
    }
    this.isMember = function(id){
        id = id.toString()
        return (
            Array.from(party.values()).includes(id) ||
            Array.from(party.keys()).includes(id)
        )
    }
}
