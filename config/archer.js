module.exports = [
	// Velik's Mark
	{
		type: 'MissingDuringCombat',
		target: 'MyBoss',
		abnormalities: [600502, 600501, 600500],
		message: "Missing Velik's Mark",
		rewarn_timeout: 10
	},

	// Sniper's Eye
	{
		type: 'MissingDuringCombat',
		target: 'Self',
		abnormalities: [601100, 601101],
		message: "Missing Sniper's Eye",
		rewarn_timeout: 10
	},
]
