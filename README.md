# battle-notify

A [tera-proxy](https://github.com/meishuu/tera-proxy) module to show text notifications on configurable in-game events.

## Preview

[Click me](https://i.imgur.com/Rt6T3Hg.jpg) to view a preview of a `battle-notify` event. (Boss enraged)

## Installation

Clone to `tera-proxy/bin/node_modules/battle-notify`

Please make sure that your copy of [tera-proxy](https://github.com/meishuu/tera-proxy) and it's dependencies (mainly [tera-data](https://github.com/meishuu/tera-data)) is up to date.

## Configuration

The `config` folder contains all of the files necessary to customize the events that are shown.

## Abnormality Events

This is an example of an abnormality event:
```
	// Enrage Expiring, notify at 12 and 6 seconds remaining
,	{
		type: 'expiring',
		target: 'MyBoss',
		abnormalities: 8888888,
		message: 'Enrage {duration}',
		time_remaining: [12, 6]
	}
```

#### type

The `type` field can be any of the following (case-insensitive):
- `'Added'` An abnormality was added to the target.
- `'AddedOrRefreshed'` An abnormality was added, or refreshed on the target.
- `'Refreshed'` An abnormality was refreshed on the target.
  - Both `Refreshed` types have extra arguments: `required_stacks` (Default: 1)
  - Specifying `required_stacks` of `5` would mean that the module only notifies you once the abnormality is refreshed with stacks of `5` or higher. This field only takes an integer as an argument.
- `'Expiring'` An abnormality is expiring on the target.
  - This type has extra arguments: `time_remaining` (Default: 6)
  - Specifying a `time_remaining` of `6` would mean that when 6 seconds are left on the buff or debuff, the notification for this event is shown.
  - Specifying a `time_remaining` of `[6, 12]`, in an array, works in a similar manner but for both 6 and 12 seconds. There is no limit on how many integers you can specify.
- `'Missing'` All of the specified abnormalities are missing from the target.
- `'MissingDuringCombat'` Similar to `Missing`, but only triggers when you are in combat.
  - Both `Missing` types have extra arguments: `rewarn_timeout` (Default: 5)
  - Specifying a `rewarn_timeout` of `5` would mean that you are notified every 5 seconds while the conditions for the event are met. This prevents spam. This field only takes an integer as an argument.

#### target

The `target` field can be any of the following (case-insensitive):
- `'Self'` Your character.
- `'MyBoss'` The boss that you are attacking.
- `'Party'` Any party member, excluding yourself.
- `'PartyIncludingSelf'` Any party member, including yourself.

#### abnormalities

The `abnormalities` field specifies the ID of the buff or debuff (known in the game as an `abnormality`) that you want to track.

You can find a list of buffs and debuffs in the `hotdot` file for your region in the [TeraDpsMeterData](https://github.com/neowutran/TeraDpsMeterData/tree/master/hotdot) repository. [Here](https://github.com/neowutran/TeraDpsMeterData/blob/master/hotdot/hotdot-NA.tsv) is a link to the list of abnormalities for NA region. The leftmost column indicates the abnormality ID.

You can specify multiple abnormalities in an array `[11111, 22222]` or a single abnormality on it's own `11111`.

Since the game does not normally have an abnormality ID for enrage, it is hard-coded in the module as ID `8888888`. The module estimates how long the entity should stay enraged for, and when the next enrage should be, using the generally known 36-second rule. This is not accurate for all bosses, however, so be warned should you encounter some inaccuracies.

#### message

The `message` field specifies the message to be shown on the in-game notification when the event triggers. It should be a string.

You can use the following text in your string and the module will replace it with the relevant information:
- `{duration}` Display the remaining duration of the abnormality. Will not work with `'Missing'` or `'Removed'` type events. (Displays in seconds, e.g. `36s`)
- `{stacks}` Display the number of stacks that the abnormality has on the target. (Displays an integer, e.g. `6`)
- `{name}` The in-game name of the target that was specified.
- `{nextEnrage}` The HP percentage that the target is expected to enrage at next. Only works with bosses. See note above in the `abnormalities` section about inaccuracies of enrage prediction. (Displays a percentage, e.g. `55%`)
- `{icon}` The icon of the abnormality in question. (Note that Enrage does not have an icon by itself, so I am using focused niveot icon instead)

#### Argument fields

Extra arguments should be supplied for some event types. You can find details about them in the `type` section of this readme.

## Cooldown Events

Skill cooldown events should only be used in class-specific config files (i.e. anything but `config/common.js`), to avoid conflicts skill IDs between classes.

Item cooldown events may be used in any config file.

This is an example of a cooldown event:
```
	// Fire Avalanche is coming off cooldown in 10 seconds
,	{
		type: 'Expiring',
		skills: 80100,
		message: '{icon} {duration}',
		time_remaining: 10
	}
```

This is an example of a skill reset event:
```
	// Blade Draw Reset
,	{
		type: 'Reset',
		skills: [290100, 370100], // normal & deadly gamble version of blade draw
		message: '{icon} Reset'
	}
```

#### type

The `type` field for a cooldown event can be any of the following:
- `'Expiring'` A cooldown is expiring in a specified amount of time.
- `'ExpiringDuringCombat'` As above, plus you are in combat.
- `'ExpiringDuringEnrage'` As above, plus the boss is enraged.
	- All of the above `'Expiring'` type events have extra arguments: `time_remaining` (Default: 6)
	- A `time_remaining` of `5` would mean that you are notified when 5 seconds are left on the cooldown of the skill or item.
	- You can specify multiple values in an array `[5, 10]` to be notified at multiple times, 5 and 10 seconds in this case.
- `'Ready'` The item or skill in question is off cooldown.
- `'ReadyDuringCombat'` As above, plus you are in combat.
- `'ReadyDuringEnrage'` As above, plus the boss is enraged.
	- All of the above `'Ready'` type events have extra arguments: `rewarn_timeout` (Default: 5)
	- A `rewarn_timeout` of `5` would mean that you are notified every 5 seconds while the conditions for the event are met. This prevents spam.
- `'Reset'` The skill's cooldown was reset by a glyph.

Please note! `Ready` type events will also be triggered by skill resets. There should be no cases in which you need a `Ready` event and a `Reset` event for the same skill. Should you configure it as such, you would be notified twice when a skill reset happens.

#### skills

The `skills` field for a skill reset event specifies the skill IDs that you would like to track.

You can find a list of skills in the `skills` file for your region in the [TeraDpsMeterData](https://github.com/neowutran/TeraDpsMeterData/blob/master/skills/) repository. [Here](https://github.com/neowutran/TeraDpsMeterData/blob/master/skills/skills-NA.tsv) is a link to the list of skills for NA region. The leftmost column indicates the skill ID.

You can specify a single skill ID `290100` or multiple skill IDs in an array `[290100, 370100]`.

Skills trigger an event by their respective group, rather than the raw skill ID that you supply. So, `290100` would hook group `29`. This is done so that you do not need to supply the skill ID for each level of the skill. However, in some cases a skill has a different group in certain conditions (See warrior blade draw with & without deadly gamble buff, or slayer OHS with ICB). In these cases you must provide the base skill ID and the buffed skill ID, as shown above for warrior's blade draw.

#### items

The `items` field specifies the item ID(s) that you want to track.

You can find a list of item IDs at this website, under `Database -> Items`: [TeraDatabase](http://teradatabase.net) (note: You should *not* use this site to obtain skill IDs. Only use this site for item IDs).

You can specify a single item ID `98267` or multiple item IDs in an array `[98267, 98260]`.

You may specify items and skills under the same event, but they must still be separated by their respective types.
```
	skills: 80100,
	items: [98267, 98260]
```

When you specify multiple skills, items, or both, they will be processed individually. This means that the script will not wait for *all* of the skills/items to meet the conditions that you specify, it will check if each of them meets the condition individually and notify you as such.

#### message

The `message` field specifies the message to be shown on the in-game notification when the event triggers. It should be a string.

You can use the following text in your string and the module will replace it with the relevant information:
- `{duration}` Display the time remaining on the cooldown, in seconds. (e.g. `5s`)
- `{icon}` Display the icon of the skill or item in question.

## Planned Features
- Custom message styling (colour, size)
- Custom notification types (pop-up, chat)
- Boss mechanic events (e.g. P3 Vergos debuffs)
- In-game commands (on, off, ...)
