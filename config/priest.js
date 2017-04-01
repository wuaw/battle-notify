module.exports = [
	// Triple Nemesis
	{
		type: 'MissingDuringCombat',
		target: 'MyBoss',
		abnormalities: 28090,
		message: "Missing Triple Nemesis",
		rewarn_timeout: 10
	},

	// Energy Stars
	{
		type: 'MissingDuringCombat',
		target: 'Self',
		abnormalities: [801500, 801501, 801502, 801503],
		message: "Missing Energy Stars",
		rewarn_timeout: 10
	},

	// Shakan
	{
		type: 'MissingDuringCombat',
		target: 'Self',
		abnormalities: [805102, 805101],
		message: "Missing Power Buff",
		rewarn_timeout: 10
	},

	// Balder
	{
		type: 'MissingDuringCombat',
		target: 'Self',
		abnormalities: [805600, 805601, 805602, 805603, 805604],
		message: "Missing Endurance Buff",
		rewarn_timeout: 10
	},
]
