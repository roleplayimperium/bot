const { Collection } = require('discord.js');
const commands = new Collection();

commands.set('verifizierung', {
    name: 'verifizierung',
    description: 'Sendet das Verifizierungs Embed.',
    options: [],
});

commands.set('test-welcome', {
    name: 'test-welcome',
    description: 'Testet die Willkommensnachricht.',
    options: [
        { name: 'user', description: 'Optionaler Benutzer fuer den Welcome-Test.', type: 6, required: false },
    ],
});

commands.set('regelwerk', {
    name: 'regelwerk',
    description: 'Sendet das Regelwerk Embed.',
    options: [],
});

commands.set('dc-regelwerk', {
    name: 'dc-regelwerk',
    description: 'Sendet das Discord-Regelwerk Embed.',
    options: [],
});

commands.set('tickets', {
    name: 'tickets',
    description: 'Sendet das Ticket-Panel.',
    options: [],
});

commands.set('invites', {
    name: 'invites',
    description: 'Zeigt dir wie viele leute du Eingeladen hast.',
    options: [{ name: 'user', description: 'Das Mitglied von dem du die Einladungen sehen möchtest.', type: 6, required: false }],
});


commands.set('frak-warn', {
    name: 'frak-warn',
    description: 'Gibt einer Fraktion einen Warn.',
    options: [
        { name: 'fraktion', description: 'Der Name der Fraktion.', type: 3, required: true },
        { name: 'grund', description: 'Der Grund für den Frak-Warn.', type: 3, required: true },
        { name: 'nummer', description: 'Frak-Warn Nummber (1, 2, 3).', type: 3, required: true },
    ],
});

commands.set('frak-offiziell', {
    name: 'frak-offiziell',
    description: 'Macht eine Fraktion Offiziell.',
    options: [
        { name: 'fraktion', description: 'Der Name der Fraktion.', type: 3, required: true },
        { name: 'leitung', description: 'Der Grund für den Frak-Warn.', type: 6, required: true },
        {
            name: 'aufbauschutz',
            description: 'Der Grund für den Frak-Warn.',
            type: 3,
            required: true,
            choices: [
                { name: '3 Tage', value: '3 Tage' },
                { name: '6 Tage', value: '6 Tage' },
                { name: 'Kein Aufbauschutz', value: 'Kein Aufbauschutz' },
            ],
        },
    ],
});

commands.set('team-warn', {
    name: 'team-warn',
    description: 'Gibt ein Teammitglied einen Teamwarn.',
    options: [
        { name: 'teammitglied', description: 'Teammitglied der den Warn bekommen soll.', type: 6, required: true },
        { name: 'grund', description: 'Der Grund für den Warn.', type: 3, required: true },
        {
            name: 'rechte-entzug',
            description: 'Soll das Teammitglied einen Rechte Entzug bekommen?',
            type: 3,
            required: true,
            choices: [
                { name: 'Kein Rechteentzug', value: 'Kein Rechteentzug' },
                { name: '3 Tage', value: '3 Tage' },
                { name: '6 Tage', value: '6 Tage' },
            ],
        },
        {
            name: 'teamwarn',
            description: 'Wie vielter Teamwarn',
            type: 3,
            required: true,
            choices: [
                { name: '1. Teamwarn', value: '1. Teamwarn' },
                { name: '2. Teamwarn', value: '2. Teamwarn' },
                { name: '3. Teamwarn', value: '3. Teamwarn' },
            ],
        },
    ],
});

commands.set('team-uprank', {
    name: 'team-uprank',
    description: 'Gibt ein Teammitglied einen Uprank.',
    options: [
        { name: 'teammitglied', description: 'Teammitglied der den Uprank bekommen soll.', type: 6, required: true },
        { name: 'grund', description: 'Der Grund für den Uprank.', type: 3, required: true },
        { name: 'rolle', description: 'Die Rolle die das Teammitglied bekommen soll.', type: 8, required: true },
    ],
});

commands.set('team-derank', {
    name: 'team-derank',
    description: 'Gibt ein Teammitglied einen Derank.',
    options: [
        { name: 'teammitglied', description: 'Teammitglied der den Derank bekommen soll.', type: 6, required: true },
        { name: 'grund', description: 'Der Grund für den Derank.', type: 3, required: true },
        { name: 'rolle', description: 'Die Rolle die das Teammitglied bekommen soll.', type: 8, required: true },
    ],
});

commands.set('team-beitritt', {
    name: 'team-beitritt',
    description: 'Lässt ein Teammitglied dem Team beitreten.',
    options: [
        { name: 'teammitglied', description: 'Teammitglied der dem Team Beitreten soll.', type: 6, required: true },
        { name: 'grund', description: 'Der Grund für den Beitritt.', type: 3, required: true },
        { name: 'rolle', description: 'Die Rolle die, der Teamler bekommen soll', type: 8, required: true },
    ],
});

commands.set('team-kick', {
    name: 'team-kick',
    description: 'Kickt ein Teammitglied aus dem Team.',
    options: [
        { name: 'teammitglied', description: 'Teammitglied der das Team verlassen soll.', type: 6, required: true },
        { name: 'grund', description: 'Der Grund für den Kick.', type: 3, required: true },
    ],
});

commands.set('umfrage', {
    name: 'umfrage',
    description: 'Sendet eine Umfrage',
    options: [],
});

commands.set('team-umfrage', {
    name: 'team-umfrage',
    description: 'Sendet eine Team Umfrage',
    options: [],
});

commands.set('team-announce', {
    name: 'team-announce',
    description: 'Sendet eine Team Ankuendigung',
    options: [],
});

commands.set('frak-auflosung', {
    name: 'frak-auflosung',
    description: 'Löst eine Fraktion auf.',
    options: [
        { name: 'fraktion', description: 'Der Name der Fraktion.', type: 3, required: true },
        { name: 'grund', description: 'Der Grund für die Auflösung.', type: 3, required: true },
    ],
});

commands.set('frak-liste', {
    name: 'frak-liste',
    description: 'Sendet die Fraktions Liste.',
    options: [],
});

commands.set('changelog', {
    name: 'changelog',
    description: 'Sendet einen Changelog',
    options: [],
});

commands.set('warnung', {
    name: 'warnung',
    description: 'Sendet eine Warnung per DM an ein Teammitglied.',
    options: [
        { name: 'teammitglied', description: 'Das Teammitglied, das verwarnt werden soll.', type: 6, required: true },
        { name: 'grund', description: 'Der Grund fuer die Warnung.', type: 3, required: true },
    ],
});

commands.set('support-eintrag', {
    name: 'support-eintrag',
    description: 'Erstellt einen Support Eintrag.',
    options: [
        { name: 'spieler', description: 'Der Spieler den du Supportet hast.', type: 6, required: true },
        {
            name: 'anliegen',
            description: 'Was wollte der Spieler?',
            type: 3,
            required: true,
            choices: [
                { name: 'Frage', value: 'Frage' },
                { name: 'Regelverstoß melden', value: 'Regelverstoß melden' },
                { name: 'Bug', value: 'Bug' },
                { name: 'Entbannung', value: 'Entbannung' },
            ],
        },
        {
            name: 'aktion',
            description: 'Was hast du Gemacht?',
            type: 3,
            required: true,
            choices: [
                { name: 'Frage Beantwortet', value: 'Frage Beantwortet' },
                { name: 'Verwarnt', value: 'Verwarnt' },
                { name: 'Bann', value: 'Bann' },
                { name: 'Entbannt', value: 'Entbannt' },
            ],
        },
        {
            name: 'weitergeholfen',
            description: 'Konntest dem Spieler Weiterhelfen?',
            type: 3,
            required: true,
            choices: [
                { name: 'Ja', value: 'Ja' },
                { name: 'Nein', value: 'Nein' },
            ],
        },
    ],
});

commands.set('support-count', {
    name: 'support-count',
    description: 'Checkt die Support Eintrage vom Teamler',
    options: [
        { name: 'teamler', description: 'Der Teamler den du Checken Willst.', type: 6, required: true },
    ],
});

module.exports = commands;
