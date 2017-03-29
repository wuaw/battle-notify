# battle-notify

A [tera-proxy](https://github.com/meishuu/tera-proxy) module to show text notifcations on configurable in-game events.

## Preview

[Click me](https://i.imgur.com/Rt6T3Hg.jpg) to view a preview of a `battle-notify` event. (Boss enraged)

## Installation

Clone to `tera-proxy/bin/node_modules/battle-notify`

Please make sure that your copy of [tera-proxy](https://github.com/meishuu/tera-proxy) and it's dependencies (mainly [tera-data](https://github.com/meishuu/tera-data)) is up to date.

## Configuration

The `config` folder contains all of the files necessary to customize the events that are shown.

This is an example event:
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

#### Type

The `type` field can be any of the following (case-insensitive): 
- `Added` An abnormality was added to the target. 
- `AddedOrRefreshed` An abnormality was added, or refreshed on the target.
- `Refreshed` An abnormality was refreshed on the target.
- `Expiring` An abnormality is expiring on the target.
  - This type has extra arguments: `time_remaining`
  - Specifying a `time_remaining` of `6` would mean that when 6 seconds are left on the buff or debuff, the notification for this event is shown.
  - Specifying a `time_remaining` of `[6, 12]`, in an array, works in a similar manor but for both 6 and 12 seconds. There is no limit on how many integers you can specify.
- `Missing` All of the specified abnormalities are missing from the target.
- `MissingDuringCombat` Similar to `Missing`, but only triggers when you are in combat.
  - Both `Missing` types have extra arguments: `rewarn_timeout`
  - Specifying a `rewarn_timeout` of `5` would mean that the module waits 5 seconds after warning you of the event before it warns you again. This prevents spam. This field only takes a single integer as an argument.

#### Target

The `target` field can be any of the following (case-insensitive):
- `Self` Your character.
- `MyBoss` The boss that you are attacking.
- `Party` Any party member, excluding yourself.
- `PartyIncludingSelf` Any party member, including yourself.

#### Abnormalities

The `abnormalities` field specifies the ID of the buff or debuff (known in the game as an `abnormality`) that you want to track.

You can find a list of buffs and debuffs in the `hotdot` file for your region in the [TeraDpsMeterData](https://github.com/neowutran/TeraDpsMeterData/tree/master/hotdot) repository. [Here](https://github.com/neowutran/TeraDpsMeterData/blob/master/hotdot/hotdot-NA.tsv) is a link to the list of abnormalities for NA region.

You can specify multiple abnormalities in an array `[11111, 22222]` or a single abnormality on it's own `11111`.

Since the game does not normally have an abnormality ID for enrage, it is hard-coded in the module as ID `8888888`. The module estimates how long the entity should stay enraged for, and when the next enrage should be, using the generally known 36-second rule. This is not accurate for all bosses, however, so be warned should you encounter some inaccuracies.

#### Message

The `message` field specifies the message to be shown on the in-game notification when the event triggers. It should be a string.

You can use the following text in your string and the module will replace it with the relevant information:
- `{duration}` Display the remaining duration of the abnormality. Will not work with `Missing` or `Removed` type events.
- `{name}` The in-game name of the `target` that was specified.
- `{nextEnrage}` The HP percentage that the `target` is expected to enrage at next. Only works with bosses. See note above in the `abnormalities` section about inaccuracies of enrage prediction.

#### Argument fields

Extra arguments should be supplied for some event types. You can find details about them in the `type` section of this readme.

## Planned Features
- Custom message styling (colour, size)
- Custom notification types (pop-up, chat)
- Boss mechanic events (e.g. P3 Vergos debuffs)
- Cooldown events
- In-game commands (on, off, ...)
