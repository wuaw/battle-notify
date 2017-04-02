module.exports = [
	// Missing stance
	{
		type: 'MissingDuringCombat',
		target: 'Self',
		abnormalities: [100100, 100101, 100102, 100103, 100200, 100201, 100202, 100203],
		message: 'Missing Stance',
		rewarn_timeout: 10
	},

/*
	// Blade Draw Reset
	{
		type: 'Reset',
		skills: [290100, 370100], // normal & deadly gamble version of blade draw
		message: '{icon} Reset'
	},
*/

/*
	// Vergos Aggro Debuff
   {
		type: 'AddedOrRefreshed',
		target: 'PartyIncludingSelf',
		abnormalities: 950023,
		message: '{name} has {stacks} stack(s)',
		required_stacks: 1
	},

	// Vergos Aggro Debuff Expire
   {
		type: 'Removed',
		target: 'PartyIncludingSelf',
		abnormalities: 950023,
		message: '{name}\'s stacks expired'
	},
*/
]
