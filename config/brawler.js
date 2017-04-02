module.exports = [

    // Vergos Aggro Debuff
   {
		type: 'AddedOrRefreshed',
		target: 'PartyIncludingSelf',
		abnormalities: 950023,
		message: '{name} has {stacks} stacks',
		required_stacks: 1
	},

	// Vergos Aggro Debuff Expire
   {
		type: 'Expiring',
		target: 'PartyIncludingSelf',
		abnormalities: 950023,
		message: '{name}\'s stacks are expiring',
		time_remaining: 4
	},
]
