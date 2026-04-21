console.clear();
const discord = require('discord.js');
const chalk = require('chalk-v2');
const commands = require('./commands.js');
const Config = require('./config.js');
const data = require('./data.json');
const fs = require('fs');
const cooldown = {
    welcome: new Set(),
    suggestion: new Set(),
};

const client = new discord.Client({
    intents: [
        discord.GatewayIntentBits.Guilds,
        discord.GatewayIntentBits.GuildMembers,
        discord.GatewayIntentBits.GuildMessages,
        discord.GatewayIntentBits.GuildMessageReactions,
        discord.GatewayIntentBits.GuildInvites,
        discord.GatewayIntentBits.GuildVoiceStates,
        discord.GatewayIntentBits.MessageContent,
    ],
    partials: [
        discord.Partials.Channel,
        discord.Partials.Message,
        discord.Partials.User,
        discord.Partials.GuildMember,
        discord.Partials.Reaction,
    ],
});

const ADMIN_PERMISSION = discord.PermissionFlagsBits.Administrator;

function hasAdminPermission(member) {
    return Boolean(member?.permissions?.has(ADMIN_PERMISSION));
}


function getRandomColor() {
    return '#3b3b3b';
}

function getServerIcon(guild) {
    return guild?.iconURL({ forceStatic: false }) || Config.Settings['bilder'].logo;
}

function createWelcomeEmbeds(user, guild) {
    const serverIcon = getServerIcon(guild);

    const welcomeEmbed = new discord.EmbedBuilder()
        .setAuthor({
            name: Config.Settings['Name'],
            iconURL: serverIcon,
        })
        .setColor('#FE9E19')
        .setTitle('Herzlich Willkommen')
        .setDescription(
            `Hallo **${user.username}**,` +
            `\nWillkommen auf **${Config.Settings['Name']}**!` +
            `\n\nBitte lies dir zuerst unser Regelwerk in <#${Config.Settings['Regelwerk-Channel']}> gründlich durch.` +
            `\n\nWenn du noch Fragen hast, kannst du jederzeit ein Support-Ticket öffnen.` +
            `\n\n**Mit freundlichen Grüßen,**` +
            `\nDein **${Config.Settings['Team-Name']}**`,
        )
        .setThumbnail(user.displayAvatarURL())
        .setImage(Config.Settings['bilder'].banner)
        .setTimestamp(new Date(Date.now()))
        .setFooter({ text: user.username, iconURL: user.displayAvatarURL() });

    return { welcomeEmbed };
}

function createTicketPanelEmbed(guild) {
    const serverIcon = getServerIcon(guild);

    return new discord.EmbedBuilder()
        .setAuthor({
            name: Config.Settings['Name'],
            iconURL: serverIcon,
        })
        .setColor('#FE9E19')
        .setTitle('Tickets')
        .setDescription(
            'Wähle unten die passende Ticket-Art aus.' +
            '\n\nVerfügbar: Support, Highteam, Fraktion, Team und Partner.',
        )
        .setThumbnail(serverIcon)
        .setTimestamp(new Date(Date.now()))
        .setFooter({
            text: Config.Settings['Name'],
            iconURL: serverIcon,
        });
}

function createTicketPanelRows() {
    const firstRow = new discord.ActionRowBuilder().addComponents(
        new discord.ButtonBuilder()
            .setCustomId('open-ticket:support')
            .setLabel('Support Ticket')
            .setStyle(discord.ButtonStyle.Primary),
        new discord.ButtonBuilder()
            .setCustomId('open-ticket:highteam')
            .setLabel('Highteam Ticket')
            .setStyle(discord.ButtonStyle.Secondary),
        new discord.ButtonBuilder()
            .setCustomId('open-ticket:fraktion')
            .setLabel('Fraktions Ticket')
            .setStyle(discord.ButtonStyle.Success),
    );

    const secondRow = new discord.ActionRowBuilder().addComponents(
        new discord.ButtonBuilder()
            .setCustomId('open-ticket:team')
            .setLabel('Team Ticket')
            .setStyle(discord.ButtonStyle.Secondary),
        new discord.ButtonBuilder()
            .setCustomId('open-ticket:partner')
            .setLabel('Partner Ticket')
            .setStyle(discord.ButtonStyle.Danger),
    );

    return [firstRow, secondRow];
}

function createCloseTicketRow() {
    return new discord.ActionRowBuilder().addComponents(
        new discord.ButtonBuilder()
            .setCustomId('close-ticket')
            .setLabel('Ticket schließen')
            .setStyle(discord.ButtonStyle.Danger),
    );
}

function getTicketTypeLabel(ticketType) {
    const ticketTypes = {
        support: 'Support',
        highteam: 'Highteam',
        fraktion: 'Fraktion',
        team: 'Team',
        partner: 'Partner',
    };

    return ticketTypes[ticketType] || 'Support';
}

function getTicketCategoryId(ticketType) {
    return Config.Settings['tickets'].Categories?.[ticketType] || Config.Settings['tickets'].Categories?.support;
}

function getTicketChannelName(user, ticketType) {
    const ticketPrefix = ticketType ? ticketType.toLowerCase().replace(/[^a-z0-9]/g, '') : 'ticket';
    const safeName = user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16) || 'user';
    return `${ticketPrefix}-${safeName}`;
}

async function sendLogEmbed(message, color, executor) {
    const webhook = new discord.WebhookClient({
        url: Config.Logs['Webhook'],
    });

    const embed = new discord.EmbedBuilder()
        .setColor(color)
        .setTitle('Discord-Logs')
        .setDescription(message)
        .setTimestamp(new Date(Date.now()))
        .setFooter({ text: executor.username, iconURL: executor.displayAvatarURL() })
        .setThumbnail(Config.Settings['bilder'].logo);

    return await webhook.send({ embeds: [embed] });
}

function updateStats(c) {
    setInterval(async () => {
        const guild = c.guilds.cache.get(Config.General['GuildId']);
        const channel = guild?.channels?.cache.get('1188859438656913529');

        if (guild && channel) {
            await channel.setName(channel.name.replace(/\d+/, guild.memberCount)).catch(() => null);
        }
    }, 10 * 60 * 1000);
}

async function updateActivity(c) {
    c.user.setActivity({
        name: Config.Settings['Name'],
        type: discord.ActivityType.Listening,
    });

    c.user.setStatus('idle');
}

async function setCommands() {
    const rest = new discord.REST({ version: '10' }).setToken(Config.General['Token']);
    await rest.put(discord.Routes.applicationGuildCommands(client.user.id, Config.General['GuildId']), {
        body: Array.from(commands.values()),
    });
}

client.on('ready', async (readyClient) => {
    await setCommands();
    updateActivity(readyClient);
    updateStats(readyClient);
    console.log(chalk.italic.hex('#FE9E19').italic('[IMPERIUM ROLEPLAY SYSTEM]'), chalk.italic.hex('#FE9E19')('- [By Ego] |'), chalk.bold.hex('#FE9E19')('Der Bot ist erfolgreich gestartet.'), chalk.reset());
});

client.on('guildMemberAdd', async (member) => {
    const channel = member.guild.channels.cache.get(Config.Settings['willkommen'].Channel);
    console.log(`[WELCOME] Neuer Join erkannt: ${member.user.tag} (${member.user.id})`);

    if (!channel) {
        console.log(`[WELCOME] Channel ${Config.Settings['willkommen'].Channel} wurde nicht gefunden.`);
        return;
    }

    if (cooldown.welcome.has(member.user.id)) {
        return;
    }

    cooldown.welcome.add(member.user.id);
    const { welcomeEmbed } = createWelcomeEmbeds(member.user, member.guild);

    try {
        if (Config.Settings['willkommen'].RolleOnJoin) {
            await member.roles.add(Config.Settings['willkommen'].Rolle);
        }
    } catch (error) {
        console.log(`---------------------------------------------------`, chalk.italic.hex('#3b3b3bff').italic('\n[Gojo-System]'), chalk.italic.hex('#3b3b3bff').italic('- ERROR'), chalk.italic.hex('#3b3b3bff')(`\nJoin-Rolle fuer `), chalk.italic.hex('#3b3b3bff')(member.user.username), chalk.italic.hex('#3b3b3bff')(` konnte nicht gesetzt werden.`), chalk.bold.hex('#3b3b3bff')(`\nGrund: ${error}`), chalk.reset(), `\n---------------------------------------------------`);
    }

    try {
        await channel.send({ content: `<@${member.user.id}>`, embeds: [welcomeEmbed] });
    } catch (error) {
        console.log(`---------------------------------------------------`, chalk.italic.hex('#3b3b3bff').italic('\n[Gojo-System]'), chalk.italic.hex('#3b3b3bff').italic('- ERROR'), chalk.italic.hex('#3b3b3bff')(`\nWillkommensnachricht fuer `), chalk.italic.hex('#3b3b3bff')(member.user.username), chalk.italic.hex('#3b3b3bff')(` konnte nicht im Server gesendet werden.`), chalk.bold.hex('#3b3b3bff')(`\nGrund: ${error}`), chalk.reset(), `\n---------------------------------------------------`);
    }

    setTimeout(() => {
        cooldown.welcome.delete(member.user.id);
    }, 2000);

    return;

    if (channel && !cooldown.welcome.has(member.user.id)) {
        cooldown.welcome.add(member.user.id);

        const embed = new discord.EmbedBuilder()
            .setAuthor({
                name: Config.Settings['Name'],
                iconURL: Config.Settings['bilder'].logo,
            })
            .setColor(getRandomColor())
            .setTitle('Herzlich Willkommen')
            .setDescription(
                `Hallo **${member.user.username}**,` +
                `\nWillkommen auf **${Config.Settings['Name']}**!` +
                `\n\nBitte lese dir das Regelwerk gründlich durch und akzeptiere die Whitelist anschließend.` +
                `\n\nWenn du noch Fragen haben solltest, kannst du gerne ein Support-Ticket öffnen.` +
                `\n\n**Mit freundlichen Grüßen,**` +
                `\nDein **${Config.Settings['Team-Name']}**`,
            )
            .setThumbnail(member.user.displayAvatarURL())
            .setImage(Config.Settings['bilder'].banner)
            .setTimestamp(new Date(Date.now()))
            .setFooter({ text: member.user.username, iconURL: member.user.displayAvatarURL() });

        const embedDM = new discord.EmbedBuilder()
            .setAuthor({
                name: Config.Settings['Name'],
                iconURL: Config.Settings['bilder'].logo,
            })
            .setColor(getRandomColor())
            .setTitle('Herzlich Willkommen🤗')
            .setDescription(
                `Hey <@${member.user.id}>, herzlich willkommen auf unserem Server. Es freut uns, dass du zu uns gefunden hast. ` +
                `Ich nehme mir einen Moment Zeit, um dich persönlich willkommen zu heißen! Wir hoffen, dass du eine großartige Zeit auf unserem Server haben wirst. ` +
                `Falls du Fragen hast oder Unterstützung benötigst, steht dir unser Support-Team zur Verfügung. Im Folgenden findest du einige Informationen zu unserem Server.\n\n` +
                `**__Informationen:__**\n\n` +
                `**Connect IP:**\nF8 Connect > BFSCL.DDNS.NET\n\n` +
                `**Voicesystem:**\nWir nutzen das Ingamevoice-System\n\n` +
                `**Du möchtest uns & den Server unterstützen?**\n[Drücke hier](${Config.Settings['Discord']})\n\n` +
                `**Unser Regelwerk:**\n[Drücke hier](https://discord.com/channels/${Config.General['GuildId']}/${Config.Settings['Regelwerk-Channel']})\n\n` +
                `**Mit freundlichen Grüßen,**\n` +
                `Dein **${Config.Settings['Team-Name']}**`
            )
            .setThumbnail(member.user.displayAvatarURL())
            .setImage(Config.Settings['bilder'].banner)
            .setTimestamp(new Date(Date.now()))
            .setFooter({ text: member.user.username, iconURL: member.user.displayAvatarURL() });
        if (Config.Settings['willkommen'].RolleOnJoin) {
            member.roles.add(Config.Settings['willkommen'].Rolle);
        }
        try {
            await channel.send({ content: `<@${member.user.id}>`, embeds: [embed] });
            //await member.user.send({ embeds: [embedDM] });
        } catch (error) {
            console.log(`---------------------------------------------------`, chalk.italic.hex('#3b3b3bff').italic('\n[Gojo-System]'), chalk.italic.hex('#3b3b3bff').italic('- ERROR'), chalk.italic.hex('#3b3b3bff')(`\nDM konnte an den Spieler`), chalk.italic.hex('#3b3b3bff')(member.user.username), chalk.italic.hex('#3b3b3bff')(`nicht gesendet werden.`), chalk.bold.hex('#3b3b3bff')(`\nGrund: ${error}`), chalk.reset(), `\n---------------------------------------------------`);
        }

        setTimeout(() => {
            cooldown.welcome.delete(member.user.id);
        }, 2000);
    }
});
client.on('guildMemberRemove', async (interaction) => {
    const channel = interaction.guild.channels.cache.get('1213467133875593256');

    if (channel) {

        const embed = new discord.EmbedBuilder()
            .setAuthor({
                name: Config.Settings['Name'],
                iconURL: Config.Settings['bilder'].logo,
            })
            .setColor(getRandomColor())
            .setTitle('Discord Verlassen :(')
            .setDescription(
                `<@${interaction.user.id}> hat den Discord verlassen!`,
            )
            .setThumbnail(interaction.user.displayAvatarURL())
            .setTimestamp(new Date(Date.now()))
            .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() });

            await channel.send({ content: `<@${interaction.user.id}>`, embeds: [embed] });
        }
    });

    client.on('guildMemberUpdate', (oldMember, newMember) => {
        if (!oldMember.roles.cache.equals(newMember.roles.cache)) {
          const changedRoles = newMember.roles.cache
            .filter(role => !oldMember.roles.cache.has(role.id))
            .map(role => `[+] ${role.name}`)
            .concat(oldMember.roles.cache
              .filter(role => !newMember.roles.cache.has(role.id))
              .map(role => `[-] ${role.name}`)
            );

            sendLogEmbed(`Rollen von **${newMember.user.username}** <@${newMember.user.id}> wurden aktualisiert:\n\n${changedRoles.join('\n')}`, 0x00FF00, newMember.user);
        }
      });

      const deletedMessages = new Map();

      client.on('messageDelete', async deletedMessage => {
        const logChannelName = 'ðŸ“â”ƒsystem';
        const logChannel = deletedMessage.guild.channels.cache.find(channel => channel.name === logChannelName);

        if (logChannel && deletedMessage.author) {
          try {
            const originalMessage = deletedMessages.get(deletedMessage.id) || {};
            const deletedContent = originalMessage.content || 'Inhalt nicht verfÃ¼gbar';

            sendLogEmbed(`Nachricht von **${deletedMessage.author.username}** <@${deletedMessage.author.id}> wurde gelÃ¶scht von <@${deletedMessage.author.id}>\n\n**UrsprÃ¼ngliche Nachricht:**\n${deletedContent}`, 0x8800ff, deletedMessage.author);
          } catch (error) {
            console.log(`---------------------------------------------------`, chalk.italic.hex('#3b3b3bff').italic('\n[BFS-System]'), chalk.italic.hex('#3b3b3bff').italic('- ERROR'), chalk.italic.hex('#3b3b3bff')(`\nAnti-Delete Message`), chalk.italic.hex('#3b3b3bff')(deletedMessage.author.username), chalk.italic.hex('#3b3b3bff')(`konnte nicht gelogt werden.`), chalk.bold.hex('#3b3b3bff')(`\nGrund: ${error}`), chalk.reset(), `\n---------------------------------------------------`);
          }
        }
      });

      client.on('messageUpdate', (oldMessage, newMessage) => {
        deletedMessages.set(newMessage.id, newMessage);
      });

      client.on('messageCreate', message => {
        deletedMessages.set(message.id, message);
      });

/* client.on('voiceStateUpdate', async (oldState, newState) => {
    const guild = newState.guild || oldState.guild;
    const category = guild.channels.cache.get('1188859403202474136');
    const role = guild.roles.cache.get('1181328148403585027');
    const teamRole = guild.roles.cache.get('1188859220020445195');

    if (!guild || !newState.member || !guild.me || !guild.me.hasPermission('MANAGE_CHANNELS') || !guild.me.hasPermission('CONNECT')) {
        console.error("Der Bot hat nicht die erforderlichen Berechtigungen.");
        return;
    }

    if (teamRole && teamRole.members.some(member => member.id === newState.member.id)) {
        if (newState.channel && newState.channel.id === '1209199499709521990') {
            const supportChannel = await guild.channels.create(`ðŸŒ | ${newState.member.displayName}'s Support`, {
                type: 'voice',
                parent: category,
            });

            await supportChannel.updateOverwrite(teamRole, {
                CONNECT: true,
                SPEAK: true,
                MUTE_MEMBERS: true,
                DEAFEN_MEMBERS: true,
                MOVE_MEMBERS: true,
            });

            await supportChannel.updateOverwrite(newState.member, {
                CONNECT: true,
                SPEAK: true,
                MUTE_MEMBERS: false,
                DEAFEN_MEMBERS: false,
                MOVE_MEMBERS: true,
            });

            await supportChannel.updateOverwrite(role, {
                VIEW_CHANNEL: true,
                CONNECT: false,
                SPEAK: true,
                MUTE_MEMBERS: false,
                DEAFEN_MEMBERS: false,
                MOVE_MEMBERS: true,
            });

            await supportChannel.updateOverwrite(guild.roles.everyone, {
                VIEW_CHANNEL: false,
                CONNECT: false,
                SPEAK: true,
                MUTE_MEMBERS: false,
                DEAFEN_MEMBERS: false,
                MOVE_MEMBERS: true,
            });

            await newState.member.voice.setChannel(supportChannel);
        }

        if (oldState.channel && oldState.channel.name && oldState.channel.name.includes("'s Support") && oldState.channel.members.size === 0) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            await oldState.channel.delete();
        }
    }
}); */

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.inGuild()) return;
    const blacklisted = data.blacklistedSuggestionWords.some((str) => message.content.toLowerCase().includes(str.toLowerCase()));

    if (blacklisted) {
        if (!hasAdminPermission(message.member)) {
            sendLogEmbed(`Nachricht von **${message.author.username}** wurde gelÃ¶scht von\n\nGrund:**\nBLACKLISTED MESSAGE\n\n**UrsprÃ¼ngliche Nachricht:**\n${message.content}`, 0x8800ff, message.author);
            const embed = new discord.EmbedBuilder()
                .setColor('Red')
                .setTitle('Stop!')
                .setDescription('Deine Nachricht enthÃ¤lt ein nicht erlaubtes zeichen, bitte beachte deine ausdrucksweise!')
                .setThumbnail(message.author.displayAvatarURL())
                .setTimestamp(new Date(Date.now()))
                .setFooter({ text: message.author.username, iconURL: message.author.displayAvatarURL() });

            await message.delete().catch(() => null);
            await message.member.timeout(5 * 60 * 1000, 'Blacklisted Message').catch(() => null);
            await message.member.send({ embeds: [embed] }).catch(() => null);
            return;
        } else {
            console.log(message.author.username+" hat ein blacklisted wort geschrieben '"+message.content+"' aber hat Administrator Perms")
            return;
        }
    }

    if (message.channel && message.channel.isTextBased() && message.channel.id == Config.Settings['vorschlag'].Channel) {
        if (cooldown.suggestion.has(message.author.id)) {
            const embed = new discord.EmbedBuilder()
                .setColor('Red')
                .setTitle('Cooldown ist Aktiv')
                .setDescription('Bitte warte kurz, bevor du einen neuen Vorschlag absendest.')
                .setThumbnail(message.author.displayAvatarURL())
                .setTimestamp(new Date(Date.now()))
                .setFooter({ text: message.author.username, iconURL: message.author.displayAvatarURL() });

            await message.delete().catch(() => null);
            await message.author.send({ embeds: [embed] }).catch(() => null);
            return;
        } else {
            const embed = new discord.EmbedBuilder()
                .setColor(getRandomColor())
                .setDescription(`Vorschlag von <@${message.author.id}>\n\n\`\`\`${message.content}\`\`\``)
                .setThumbnail(message.author.displayAvatarURL())
                .setTimestamp(new Date(Date.now()))
                .setFooter({ text: message.author.username, iconURL: message.author.displayAvatarURL() });

            cooldown.suggestion.add(message.author.id);
            await message.delete().catch(() => null);

            const msg = await message.channel.send({ embeds: [embed] });

            await msg.react('ðŸ‘').catch(() => null);
            await msg.react('ðŸ‘Ž').catch(() => null);

            msg.react('ðŸ‘');
            msg.react('ðŸ‘Ž');

            setTimeout(() => {
                cooldown.suggestion.delete(message.author.id);
            }, 5000);
            return;
        }
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.inGuild()) return;

    if (interaction.isCommand() && interaction.commandName == 'test-welcome') {
        if (!hasAdminPermission(interaction.member)) {
            return await interaction.reply({
                content: 'Du hast nicht die benoetigten Rechte. Benoetigt: `Administrator`',
                ephemeral: true,
            });
        }

        const targetUser = interaction.options.getUser('user') || interaction.user;
        const channel = interaction.guild.channels.cache.get(Config.Settings['willkommen'].Channel);

        if (!channel) {
            return await interaction.reply({
                content: `Der Welcome-Channel ${Config.Settings['willkommen'].Channel} wurde nicht gefunden.`,
                ephemeral: true,
            });
        }

        const { welcomeEmbed } = createWelcomeEmbeds(targetUser, interaction.guild);

        await channel.send({ content: `<@${targetUser.id}>`, embeds: [welcomeEmbed] });

        return await interaction.reply({
            content: `Welcome-Test fuer <@${targetUser.id}> wurde gesendet.`,
            ephemeral: true,
        });
    } else if (interaction.isCommand() && interaction.commandName == 'verifizierung') {
        if (!hasAdminPermission(interaction.member)) {
            return await interaction.reply({
                content: 'Du hast du nicht die benÃ¶tigten rechte, um diesen befehl zu benutzen! BenÃ¶tigte rechte: `Administrator`',
                ephemeral: true,
            });
        }

        await interaction.deferReply({ ephemeral: true });

        const verifyChannel = interaction.guild.channels.cache.get(Config.Settings['verify'].Channel);

        if (!verifyChannel) {
            return await interaction.editReply({
                content: `Der Verify-Channel ${Config.Settings['verify'].Channel} wurde nicht gefunden.`,
                ephemeral: true,
            });
        }

        const serverIcon = getServerIcon(interaction.guild);

        const embed = new discord.EmbedBuilder()
            .setAuthor({
                name: Config.Settings['Name'],
                iconURL: serverIcon,
            })
            .setColor('#FE9E19')
            .setTitle('Verifizierung Starten')
            .setDescription(
                'Bitte verifiziere dich durch Anklicken des Buttons unten, um Zugang zu allen Funktionen und Kanälen zu erhalten.' +
                    '\n\nNach der Verifizierung bekommst du automatisch die Bürger-Rolle.' +
                    '\n\n**Mit freundlichen Grüßen,**' +
                    '\nDein **' + Config.Settings['Team-Name'] + '**',
            )
            .setThumbnail(serverIcon)
            .setTimestamp(new Date(Date.now()))
            .setFooter({
                text: Config.Settings['Name'],
                iconURL: serverIcon,
            });

        const button = new discord.ActionRowBuilder().addComponents(
            new discord.ButtonBuilder()
                .setCustomId('start-verification')
                .setLabel('Verifizierung Starten')
                .setStyle(discord.ButtonStyle.Primary)
                .setDisabled(false),

            new discord.ButtonBuilder()
                .setCustomId('verification-count')
                .setLabel('1329 Verifizierungen')
                .setStyle(discord.ButtonStyle.Secondary)
                .setDisabled(true),
        );

        await verifyChannel.send({ embeds: [embed], components: [button] });
        interaction.editReply({ content: `Aktion erfolgreich in <#${Config.Settings['verify'].Channel}> ausgefÃ¼hrt.`, ephemeral: true });
    } else if (interaction.isButton() && interaction.customId == 'start-verification') {
        await interaction.deferReply({ ephemeral: true });

        if (interaction.member.roles.cache.has(Config.Settings['verify'].Rolle)) {
            const embed = new discord.EmbedBuilder().setColor('Red').setTitle('Verifizierung').setDescription('<:MS_Cross:1192213232660787360> Du hast die Bürger-Rolle bereits.');

            await interaction.editReply({ embeds: [embed], ephemeral: true });
        } else {
            const msg = interaction.message;
            const currentLabel = msg.components?.[0]?.components?.[1]?.label || '0 Verifizierungen';
            const currentCount = Number((currentLabel.match(/\d+/) || ['0'])[0]);
            const updatedRow = new discord.ActionRowBuilder().addComponents(
                discord.ButtonBuilder.from(msg.components[0].components[0]),
                discord.ButtonBuilder.from(msg.components[0].components[1]).setLabel(`${currentCount + 1} Verifizierungen`),
            );

            const embed = new discord.EmbedBuilder()
                .setColor('Green')
                .setTitle('Verifizierung')
                .setDescription('<:MS_Check:1192213188868063258> Du wurdest erfolgreich verifiziert und hast die Bürger-Rolle erhalten.');

            await interaction.editReply({ embeds: [embed], ephemeral: true });
            await interaction.member.roles.add(Config.Settings['verify'].Rolle);

            await msg.edit({ components: [updatedRow] });
            sendLogEmbed(`**${interaction.user.username}** <@${interaction.user.id}> hat sich erfolgreich Verifiziert.`, 'Blue', interaction.user);
        }
    } else if (interaction.isButton() && interaction.customId.startsWith('open-ticket')) {
        await interaction.deferReply({ ephemeral: true });

        const ticketType = interaction.customId.includes(':') ? interaction.customId.split(':')[1] : 'support';
        const ticketTypeLabel = getTicketTypeLabel(ticketType);
        const existingTicket = interaction.guild.channels.cache.find(
            (channel) =>
                channel.type === discord.ChannelType.GuildText &&
                typeof channel.topic === 'string' &&
                channel.topic.startsWith(`ticket-owner:${interaction.user.id};`),
        );

        if (existingTicket) {
            return await interaction.editReply({
                content: `Du hast bereits ein offenes Ticket: <#${existingTicket.id}>`,
                ephemeral: true,
            });
        }

        const supportRoleId = Config.Settings['Supporteintrag'].Permissions;
        const supportRole = interaction.guild.roles.cache.get(supportRoleId);
        const ticketCategoryId = getTicketCategoryId(ticketType);
        const ticketCategory = interaction.guild.channels.cache.get(ticketCategoryId);
        const serverIcon = getServerIcon(interaction.guild);
        const ticketChannelOptions = {
            name: getTicketChannelName(interaction.user, ticketType),
            type: discord.ChannelType.GuildText,
            topic: `ticket-owner:${interaction.user.id};type:${ticketType}`,
            permissionOverwrites: [
                {
                    id: interaction.guild.roles.everyone.id,
                    deny: [discord.PermissionFlagsBits.ViewChannel],
                },
                {
                    id: interaction.user.id,
                    allow: [
                        discord.PermissionFlagsBits.ViewChannel,
                        discord.PermissionFlagsBits.SendMessages,
                        discord.PermissionFlagsBits.ReadMessageHistory,
                        discord.PermissionFlagsBits.AttachFiles,
                        discord.PermissionFlagsBits.EmbedLinks,
                    ],
                },
                {
                    id: client.user.id,
                    allow: [
                        discord.PermissionFlagsBits.ViewChannel,
                        discord.PermissionFlagsBits.SendMessages,
                        discord.PermissionFlagsBits.ReadMessageHistory,
                        discord.PermissionFlagsBits.ManageChannels,
                    ],
                },
            ],
        };

        if (supportRole) {
            ticketChannelOptions.permissionOverwrites.push({
                id: supportRole.id,
                allow: [
                    discord.PermissionFlagsBits.ViewChannel,
                    discord.PermissionFlagsBits.SendMessages,
                    discord.PermissionFlagsBits.ReadMessageHistory,
                    discord.PermissionFlagsBits.ManageMessages,
                ],
            });
        }

        if (ticketCategory) {
            ticketChannelOptions.parent = ticketCategory.id;
        }

        const ticketChannel = await interaction.guild.channels.create(ticketChannelOptions);
        const ticketEmbed = new discord.EmbedBuilder()
            .setAuthor({
                name: Config.Settings['Name'],
                iconURL: serverIcon,
            })
            .setColor('#FE9E19')
            .setTitle(`${ticketTypeLabel} Ticket`)
            .setDescription(
                `Hallo <@${interaction.user.id}>, dein ${ticketTypeLabel}-Ticket wurde erstellt.` +
                '\n\nBitte schreibe hier jetzt dein Anliegen rein. Das Support-Team wird sich darum kümmern.',
            )
            .setThumbnail(serverIcon)
            .setTimestamp(new Date(Date.now()))
            .setFooter({
                text: Config.Settings['Name'],
                iconURL: serverIcon,
            });

        const supportMention = supportRole ? ` <@&${supportRole.id}>` : '';

        await ticketChannel.send({
            content: `<@${interaction.user.id}>${supportMention}`,
            embeds: [ticketEmbed],
            components: [createCloseTicketRow()],
        });

        await interaction.editReply({
            content: `Dein Ticket wurde erstellt: <#${ticketChannel.id}>`,
            ephemeral: true,
        });
    } else if (interaction.isButton() && interaction.customId == 'close-ticket') {
        await interaction.deferReply({ ephemeral: true });

        if (
            interaction.channel.type !== discord.ChannelType.GuildText ||
            !interaction.channel.topic ||
            !interaction.channel.topic.startsWith('ticket-owner:')
        ) {
            return await interaction.editReply({
                content: 'Dieser Button funktioniert nur in einem Ticket-Channel.',
                ephemeral: true,
            });
        }

        const supportRoleId = Config.Settings['Supporteintrag'].Permissions;
        const ticketOwnerId = interaction.channel.topic.split(';')[0].replace('ticket-owner:', '');
        const canClose =
            interaction.user.id === ticketOwnerId ||
            interaction.member.roles.cache.has(supportRoleId) ||
            hasAdminPermission(interaction.member);

        if (!canClose) {
            return await interaction.editReply({
                content: 'Du darfst dieses Ticket nicht schließen.',
                ephemeral: true,
            });
        }

        const channelToDelete = interaction.channel;
        await interaction.editReply({
            content: 'Ticket wird geschlossen...',
            ephemeral: true,
        });
        await channelToDelete.delete().catch(() => null);
    } else if (interaction.isCommand() && interaction.commandName == 'regelwerk') {
        if (!hasAdminPermission(interaction.member)) {
            return await interaction.reply({
                content: 'Du hast du nicht die benÃ¶tigten rechte, um diesen befehl zu benutzen! BenÃ¶tigte rechte: `Administrator`',
                ephemeral: true,
            });
        }

        await interaction.deferReply({ ephemeral: true });

        const regelwerkChannel = interaction.guild.channels.cache.get(Config.Settings['Regelwerk-Channel']);

        if (!regelwerkChannel) {
            return await interaction.editReply({
                content: `Der Regelwerk-Channel ${Config.Settings['Regelwerk-Channel']} wurde nicht gefunden.`,
                ephemeral: true,
            });
        }

        const serverIcon = getServerIcon(interaction.guild);

        const embed = new discord.EmbedBuilder()
            .setColor('#FE9E19')
            .setTitle('Regelwerk')
            .setDescription(Config.Settings['Regelwerk-Link'])
            .setTimestamp(new Date(Date.now()))
            .setFooter({
                text: Config.Settings['Name'],
                iconURL: serverIcon,
            });

        await regelwerkChannel.send({ embeds: [embed] });
        await interaction.editReply({ content: `Aktion erfolgreich in <#${Config.Settings['Regelwerk-Channel']}> ausgefÃ¼hrt.`, ephemeral: true });
    } else if (interaction.isCommand() && interaction.commandName == 'dc-regelwerk') {
        if (!hasAdminPermission(interaction.member)) {
            return await interaction.reply({
                content: 'Du hast du nicht die benÃ¶tigten rechte, um diesen befehl zu benutzen! BenÃ¶tigte rechte: `Administrator`',
                ephemeral: true,
            });
        }

        await interaction.deferReply({ ephemeral: true });

        const verifyChannel = interaction.guild.channels.cache.get(Config.Settings['verify'].Channel);

        if (!verifyChannel) {
            return await interaction.editReply({
                content: `Der Verify-Channel ${Config.Settings['verify'].Channel} wurde nicht gefunden.`,
                ephemeral: true,
            });
        }

        const serverIcon = getServerIcon(interaction.guild);

        const embed = new discord.EmbedBuilder()
            .setAuthor({
                name: Config.Settings['Name'],
                iconURL: serverIcon,
            })
            .setColor('#FE9E19')
            .setTitle('Discord Regelwerk')
            .setDescription(
                'Hier findest du unser Discord-Regelwerk.\n\n' +
                    '**Â§ 1 Namensgebung**\n' +
                    'Sogenannte Fake-Namen sind verboten. Nicknames dÃ¼rfen generell keine beleidigenden u.Ã¤. Inhalte haben. UnzulÃ¤ssige Nicknames werden vom Server gebannt!\n\n' +
                    '**Â§ 2 GesprÃ¤che stÃ¶ren**\n' +
                    'User, die GesprÃ¤che absichtlich stÃ¶ren und auch nach mehrmaligem Ermahnen keine Einsicht zeigen, mÃ¼ssen mit einem Channel oder Server Kick rechnen. In uneinsichtigen FÃ¤llen werden temporÃ¤re Banns verhÃ¤ngt, bis hin zum permanenten Bann.\n\n' +
                    '**Â§ 3 Beleidigungen**\n' +
                    'Wie auch Ã¼berall gilt die allgemeine Netiquette. Wer keinen vernÃ¼nftigen Umgangston beherrscht und andere User beleidigt, ob nun direkt oder subtil, muss mit den Konsequenzen leben.\n\n' +
                    '**Â§ 4 GerÃ¤usche**\n' +
                    'ObszÃ¶ne GerÃ¤usche oder Rauschen des Headsets sind zu unterlassen! Es wird auch gebeten das Mikro so einzustellen, dass die Atmung nicht dauerhaft zu hÃ¶ren ist. Wenn du nebenbei isst und hast nichts zu sagen, deaktiviere bitte dein Mikro.\n\n' +
                    '**Mit freundlichen GrÃ¼ÃŸen,**\n' +
                    'Dein **' + Config.Settings['Team-Name'] + '**',
            )
            .setThumbnail(serverIcon)
            .setTimestamp(new Date(Date.now()))
            .setFooter({
                text: Config.Settings['Name'],
                iconURL: serverIcon,
            });

        await verifyChannel.send({ embeds: [embed] });
        interaction.editReply({ content: `Aktion erfolgreich in <#${Config.Settings['verify'].Channel}> ausgefÃ¼hrt.`, ephemeral: true });
    } else if (interaction.isCommand() && interaction.commandName == 'tickets') {
        if (!hasAdminPermission(interaction.member)) {
            return await interaction.reply({
                content: 'Du hast nicht die benoetigten Rechte. Benoetigt: `Administrator`',
                ephemeral: true,
            });
        }

        await interaction.deferReply({ ephemeral: true });

        const ticketPanelChannel = interaction.guild.channels.cache.get(Config.Settings['tickets'].Channel);

        if (!ticketPanelChannel) {
            return await interaction.editReply({
                content: `Der Ticket-Channel ${Config.Settings['tickets'].Channel} wurde nicht gefunden.`,
                ephemeral: true,
            });
        }

        await ticketPanelChannel.send({
            embeds: [createTicketPanelEmbed(interaction.guild)],
            components: createTicketPanelRows(),
        });

        await interaction.editReply({
            content: `Ticket-Panel wurde in <#${Config.Settings['tickets'].Channel}> gesendet.`,
            ephemeral: true,
        });
    } else if (interaction.isCommand() && interaction.commandName == 'invites') {
        await interaction.deferReply({ ephemeral: false });

        const memberid = interaction.options.getUser('user') ? interaction.options.getUser('user').id : interaction.user.id;
        const member = interaction.guild.members.cache.get(memberid);
        const invites = await interaction.guild.invites.fetch();
        let userinvitecount = 0;

        invites.forEach((invite) => {
            if (invite.inviter.id == member.id) {
                userinvitecount += Number(invite.uses);
            }
        });

        const embed = new discord.EmbedBuilder()
            .setAuthor({
                name: Config.Settings['Name'],
                iconURL: Config.Settings['bilder'].logo,
            })
            .setColor(getRandomColor())
            .setTitle(`${member.user.username}'s Einladungen`)
            .setDescription(`**${member.user.username}** <@${member.user.id}> hat aktuell **${userinvitecount}** Personen eingeladen.`)
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp(new Date(Date.now()))
            .setFooter({ text: member.user.username, iconURL: member.user.displayAvatarURL() });

        await interaction.editReply({ embeds: [embed] });
    } /* else if (interaction.isCommand() && interaction.commandName == 'spieler') {
        let playerList = '';

        fetch(`http://45.145.40.44:30120/players.json`)
            .then((response) => {
                return response.json();
            })
            .then((data) => {
                for (const player of data) {
                    playerList = `${playerList}\n> ${player.name.toString()} \`[${player.ping.toString()}ms]\``;
                }

                if (playerList == '') playerList = '\n> Es sind aktuell keine Spieler Online.';

                const embed = new discord.EmbedBuilder()
                    .setAuthor({
                        name: Config.Settings['Name'],
                        iconURL: Config.Settings['bilder'].logo,
                    })
                    .setColor(getRandomColor())
                    .setTitle(`${data.length} Spieler online`)
                    .setDescription(`Aktuell sind ${data.length.toString()} Spieler online.\n\n> **Spielerliste:** ${playerList.toString()}`)
                    .setThumbnail(interaction.user.displayAvatarURL())
                    .setTimestamp(new Date(Date.now()))
                    .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() });

                return interaction.reply({ embeds: [embed], ephemeral: false });
            });
    } */ /*else if (interaction.isCommand() && interaction.commandName == 'spenden') {
        interaction.reply({ content: 'Unser **Spenden Discord**: https://discord.gg/4yFxTcHUSd', ephemeral: true });
    } */else if (interaction.isCommand() && interaction.commandName == 'frak-warn') {
        if (interaction.member.roles.cache.has(Config.Settings['Frakupdates'].Permissions) || hasAdminPermission(interaction.member)) {
            const embed = new discord.EmbedBuilder()
                .setAuthor({
                    name: Config.Settings['Name'],
                    iconURL: Config.Settings['bilder'].logo,
                })
                .setColor(getRandomColor())
                .setTitle('Fraktions-Warn')
                .setDescription(
                    `Hiermit bekommt die Fraktion **"${interaction.options.getString('fraktion')}"** ihren **${interaction.options.getString(
                        'nummer',
                    )}.** Fraktions-Warn.\n\n**Grund:** \`${interaction.options.getString('grund')}\`\n\n**Mit freundlichen GrÃ¼ÃŸen,**\n<@${
                        interaction.user.id
                    }> - <@&${Config.Settings['Frakupdates'].Permissions}>`,
                )
                .setTimestamp(new Date(Date.now()))
                .setThumbnail(Config.Settings['bilder'].logo)
                .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() });

            const channel = interaction.guild.channels.cache.get(Config.Settings['Frakupdates'].Channel);

            await channel.send({ embeds: [embed] });

            interaction.reply({ content: 'Erfolgreich.', ephemeral: true });
        } else {
            interaction.reply({ content: `Du bist keine <@&${Config.Settings['Frakupdates'].Permissions}>.`, ephemeral: true });
        }
    } else if (interaction.isCommand() && interaction.commandName == 'frak-offiziell') {
        if (interaction.member.roles.cache.has(Config.Settings['Frakupdates'].Permissions) || hasAdminPermission(interaction.member)) {
            const embed = new discord.EmbedBuilder()
                .setAuthor({
                    name: Config.Settings['Name'],
                    iconURL: Config.Settings['bilder'].logo,
                })
                .setColor(getRandomColor())
                .setTitle('Fraktion Offiziell')
                .setDescription(
                    `Hiermit ist die Fraktion **"${interaction.options.getString('fraktion')}"** unter der Leitung von <@${
                        interaction.options.getUser('leitung').id
                    }> Offiziell.\n\n**Aufbauschutz:** ${interaction.options.getString('aufbauschutz')}\n**Leitung:** <@${
                        interaction.options.getUser('leitung').id
                    }>\n\n**Mit freundlichen GrÃ¼ÃŸen,**\n<@${interaction.user.id}> - <@&${Config.Settings['Frakupdates'].Permissions}>`,
                )
                .setTimestamp(new Date(Date.now()))
                .setThumbnail(Config.Settings['bilder'].logo)
                .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() });

            const channel = interaction.guild.channels.cache.get(Config.Settings['Frakupdates'].Channel);

            await channel.send({ embeds: [embed] });

            interaction.reply({ content: 'Erfolgreich.', ephemeral: true });
        } else {
            interaction.reply({ content: `Du bist keine <@&${Config.Settings['Frakupdates'].Permissions}>.`, ephemeral: true });
        }
    } else if (interaction.isCommand() && interaction.commandName == 'team-warn') {
        if (interaction.member.roles.cache.has(Config.Settings['Teamupdates'].Permissions) || hasAdminPermission(interaction.member)) {
            const teammitglied = interaction.options.getUser('teammitglied');
            const embed = new discord.EmbedBuilder()
                .setAuthor({
                    name: Config.Settings['Name'],
                    iconURL: Config.Settings['bilder'].logo,
                })
                .setColor(getRandomColor())
                .setTitle('Team Verwarnung')
                .setDescription(
                    `Hiermit erhÃ¤lt **<@${interaction.options.getUser('teammitglied').id}>** seinen **${interaction.options.getString('teamwarn')}**\n\n` +
                    `**Grund**: ${interaction.options.getString('grund')}\n` +
                    `**Rechte Entzug:** ${interaction.options.getString('rechte-entzug')}` +
                    `\n\n**Mit freundlichen GrÃ¼ÃŸen,**\n<@${interaction.user.id}> - <@&${Config.Settings['Teamupdates'].Permissions}>`,
                )
                .setTimestamp(new Date(Date.now()))
                .setImage(Config.Settings['bilder'].banner)
                .setThumbnail(Config.Settings['bilder'].logo)
                .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() });

                const embedDM = new discord.EmbedBuilder()
                .setAuthor({
                    name: Config.Settings['Name'],
                    iconURL: Config.Settings['bilder'].logo,
                })
                .setColor(getRandomColor())
                .setTitle('Team Kick')
                .setDescription(
                    `Hey, **<@${teammitglied.id}>** Hiermit erhÃ¤ltst du einen **Teamwarn** [zum Discord](${Config.Settings['Discord']})\n\n` +
                    `**Grund**: ${interaction.options.getString('grund')}\n\n` +
                    `**Rechte Entzug:** ${interaction.options.getString('rechte-entzug')}` +
                    `**Mit freundlichen GrÃ¼ÃŸen,**\n<@${interaction.user.id}>`,
                )
                .setTimestamp(new Date(Date.now()))
                .setThumbnail(Config.Settings['bilder'].logo)
                .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() });

            const channel = interaction.guild.channels.cache.get(Config.Settings['Teamupdates'].Channel);

            await teammitglied.send({ embeds: [embedDM] });
            await channel.send({ content: `<@${interaction.options.getUser('teammitglied').id}>`, embeds: [embed] });

            interaction.reply({ content: 'Erfolgreich.', ephemeral: true });
        } else {
            interaction.reply({ content: `Du bist keine <@&${Config.Settings['Teamupdates'].Permissions}>.`, ephemeral: true });
        }
    } else if (interaction.isCommand() && interaction.commandName == 'team-uprank') {
        if (interaction.member.roles.cache.has(Config.Settings['Teamupdates'].Permissions) || hasAdminPermission(interaction.member)) {
            const teammitglied = interaction.options.getUser('teammitglied');
            const selectedRole = interaction.options.getRole('rolle');
            const embed = new discord.EmbedBuilder()
                .setAuthor({
                    name: Config.Settings['Name'],
                    iconURL: Config.Settings['bilder'].logo,
                })
                .setColor(getRandomColor())
                .setTitle('Team Uprank')
                .setDescription(
                    `Hiermit erhÃ¤lt **<@${interaction.options.getUser('teammitglied').id}>** seinen **Uprank** auf ${selectedRole}\n\n` +
                    `**Grund**: ${interaction.options.getString('grund')}\n\n` +
                    `**Mit freundlichen GrÃ¼ÃŸen,**\n<@${interaction.user.id}> - <@&${Config.Settings['Teamupdates'].Permissions}>`,
                )
                .setTimestamp(new Date(Date.now()))
                .setImage(Config.Settings['bilder'].banner)
                .setThumbnail(Config.Settings['bilder'].logo)
                .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() });

                const embedDM = new discord.EmbedBuilder()
                .setAuthor({
                    name: Config.Settings['Name'],
                    iconURL: Config.Settings['bilder'].logo,
                })
                .setColor(getRandomColor())
                .setTitle('Team Uprank')
                .setDescription(
                    `Hey, **<@${teammitglied.id}>** Hiermit erhÃ¤ltst du hast einen **Uprank** [zum Discord](${Config.Settings['Discord']})\n\n` +
                    `**Grund**: ${interaction.options.getString('grund')}\n\n` +
                    `**Mit freundlichen GrÃ¼ÃŸen,**\n<@${interaction.user.id}>`,
                )
                .setTimestamp(new Date(Date.now()))
                .setThumbnail(Config.Settings['bilder'].logo)
                .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() });

                sendLogEmbed(`<@${interaction.user.id}> hat das Teammitglied <@${teammitglied.id}> einen Uprank gegeben.\n\nRolle: ${selectedRole}`, 'Blue', interaction.user);

            const channel = interaction.guild.channels.cache.get(Config.Settings['Teamupdates'].Channel);

            await teammitglied.send({ embeds: [embedDM] });
            await channel.send({ content: `<@${interaction.options.getUser('teammitglied').id}>`, embeds: [embed] });

            interaction.reply({ content: 'Erfolgreich.', ephemeral: true });
        } else {
            interaction.reply({ content: `Du bist keine <@&${Config.Settings['Teamupdates'].Permissions}>.`, ephemeral: true });
        }
    } else if (interaction.isCommand() && interaction.commandName == 'team-beitritt') {
        if (interaction.member.roles.cache.has(Config.Settings['Teamupdates'].Permissions) || hasAdminPermission(interaction.member)) {
            const teammitglied = interaction.options.getUser('teammitglied');
            const selectedRole = interaction.options.getRole('rolle');
            const embed = new discord.EmbedBuilder()
                .setAuthor({
                    name: Config.Settings['Name'],
                    iconURL: Config.Settings['bilder'].logo,
                })
                .setColor(getRandomColor())
                .setTitle('Team Beitritt')
                .setDescription(
                    `Hiermit tritt **<@${interaction.options.getUser('teammitglied').id}>** dem Team als ${selectedRole} bei.\n\n` +
                    `**Grund**: ${interaction.options.getString('grund')}\n\n` +
                    `**Mit freundlichen GrÃ¼ÃŸen,**\n<@${interaction.user.id}> - <@&${Config.Settings['Teamupdates'].Permissions}>`,
                )
                .setTimestamp(new Date(Date.now()))
                .setImage(Config.Settings['bilder'].banner)
                .setThumbnail(Config.Settings['bilder'].logo)
                .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() });

                const embedDM = new discord.EmbedBuilder()
                .setAuthor({
                    name: Config.Settings['Name'],
                    iconURL: Config.Settings['bilder'].logo,
                })
                .setColor(getRandomColor())
                .setTitle('Team Beitritt')
                .setDescription(
                    `Hey, **<@${teammitglied.id}>** Vielen Dank, dass du dich fÃ¼r unser Team entschieden hast! Wir freuen uns, dich bei uns zu haben.\n` +
                    `Bitte nimm dir einen Moment Zeit, um das Team Regelwerk durchzulesen und sicherzustellen, dass du mit unseren Richtlinien vertraut bist.\n`+
                    `Falls du Fragen hast, zÃ¶gere nicht, dich an eine Teamleitung zu wenden.\n` +
                    `Wir wÃ¼nschen dir eine groÃŸartige Zeit im Team und freuen uns auf die Zusammenarbeit!\n\n` +
                    `**Team-Regelwerk**: [DrÃ¼cke Hier](${Config.Settings['TeamRegelwerk-Channel']})\n\n` +
                    `**Mit freundlichen GrÃ¼ÃŸen,**\n<@${interaction.user.id}>`,
                )
                .setTimestamp(new Date(Date.now()))
                .setThumbnail(Config.Settings['bilder'].logo)
                .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() });

                sendLogEmbed(`<@${interaction.user.id}> hat das Teammitglied <@${teammitglied.id}> in das Team geholt.\n\nRolle: ${selectedRole}`, 'Blue', interaction.user);

            const channel = interaction.guild.channels.cache.get(Config.Settings['Teamupdates'].Channel);

            await teammitglied.send({ embeds: [embedDM] });
            await channel.send({ content: `<@${interaction.options.getUser('teammitglied').id}>`, embeds: [embed] });

            interaction.reply({ content: 'Erfolgreich.', ephemeral: true });
        } else {
            interaction.reply({ content: `Du bist keine <@&${Config.Settings['Teamupdates'].Permissions}>.`, ephemeral: true });
        }
    } else if (interaction.isCommand() && interaction.commandName == 'team-kick') {
        if (interaction.member.roles.cache.has(Config.Settings['Teamupdates'].Permissions) || hasAdminPermission(interaction.member)) {
            const teammitglied = interaction.options.getUser('teammitglied');
            const embed = new discord.EmbedBuilder()
                .setAuthor({
                    name: Config.Settings['Name'],
                    iconURL: Config.Settings['bilder'].logo,
                })
                .setColor(getRandomColor())
                .setTitle('Team Kick')
                .setDescription(
                    `Hiermit erhÃ¤lt **<@${interaction.options.getUser('teammitglied').id}>** seinen **Teamkick.**\n\n` +
                    `**Grund**: ${interaction.options.getString('grund')}\n\n` +
                    `**Mit freundlichen GrÃ¼ÃŸen,**\n<@${interaction.user.id}> - <@&${Config.Settings['Teamupdates'].Permissions}>`,
                )
                .setTimestamp(new Date(Date.now()))
                .setImage(Config.Settings['bilder'].banner)
                .setThumbnail(Config.Settings['bilder'].logo)
                .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() });

                const embedDM = new discord.EmbedBuilder()
                .setAuthor({
                    name: Config.Settings['Name'],
                    iconURL: Config.Settings['bilder'].logo,
                })
                .setColor(getRandomColor())
                .setTitle('Team Kick')
                .setDescription(
                    `Hey, **<@${teammitglied.id}>** Hiermit wirst du aus dem **${Config.Settings['Name']}** Team **gekickt.** Vielen Dank fÃ¼r deine Zeit im Team! Wir schÃ¤tzen deine Mitarbeit.\n` +
                    `Falls du Fragen hast, steht dir die Teamleitung zur VerfÃ¼gung. Wir wÃ¼nschen dir alles Gute auf deinem weiteren Weg!\n\n` +
                    `**Mit freundlichen GrÃ¼ÃŸen,**\n<@${interaction.user.id}>`
                )
                .setTimestamp(new Date(Date.now()))
                .setThumbnail(Config.Settings['bilder'].logo)
                .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() });

            const channel = interaction.guild.channels.cache.get(Config.Settings['Teamupdates'].Channel);

            await teammitglied.send({ embeds: [embedDM] });
            await channel.send({ content: `<@${interaction.options.getUser('teammitglied').id}>`, embeds: [embed] });

            interaction.reply({ content: 'Erfolgreich.', ephemeral: true });
        } else {
            interaction.reply({ content: `Du bist keine <@&${Config.Settings['Teamupdates'].Permissions}>.`, ephemeral: true });
        }
    } else if (interaction.isCommand() && interaction.commandName == 'team-derank') {
        if (interaction.member.roles.cache.has(Config.Settings['Teamupdates'].Permissions) || hasAdminPermission(interaction.member)) {
            const teammitglied = interaction.options.getUser('teammitglied');
            const selectedRoleId = interaction.options.getRole('rolle').id;
            const selectedRole = interaction.guild.roles.cache.get(selectedRoleId);

            if (selectedRole) {
                const embed = new discord.EmbedBuilder()
                    .setAuthor({
                        name: Config.Settings['Name'],
                        iconURL: Config.Settings['bilder'].logo,
                    })
                    .setColor(getRandomColor())
                    .setTitle('Team Derank')
                    .setDescription(
                        `Hiermit erhÃ¤lt **<@${teammitglied.id}>** seinen **Derank** auf ${selectedRole}\n\n` +
                        `**Grund**: ${interaction.options.getString('grund')}\n\n` +
                        `**Mit freundlichen GrÃ¼ÃŸen,**\n<@${interaction.user.id}> - <@&${Config.Settings['Teamupdates'].Permissions}>`,
                    )
                    .setTimestamp(new Date(Date.now()))
                    .setImage(Config.Settings['bilder'].banner)
                    .setThumbnail(Config.Settings['bilder'].logo)
                    .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() });

                const embedDM = new discord.EmbedBuilder()
                    .setAuthor({
                        name: Config.Settings['Name'],
                        iconURL: Config.Settings['bilder'].logo,
                    })
                    .setColor(getRandomColor())
                    .setTitle('Team Derank')
                    .setDescription(
                        `Hey, **<@${teammitglied.id}>** Hiermit erhÃ¤ltst du hast einen **Derank** [zum Discord](${Config.Settings['Discord']})\n\n` +
                        `**Grund**: ${interaction.options.getString('grund')}\n\n` +
                        `**Mit freundlichen GrÃ¼ÃŸen,**\n<@${interaction.user.id}>`,
                    )
                    .setTimestamp(new Date(Date.now()))
                    .setThumbnail(Config.Settings['bilder'].logo)
                    .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() });

              sendLogEmbed(`<@${interaction.user.id}> hat das Teammitglied <@${teammitglied.id}> einen Derank gegeben.\n\nRolle: ${selectedRole}`, 'Blue', interaction.user);

                const channel = interaction.guild.channels.cache.get(Config.Settings['Teamupdates'].Channel);

                await teammitglied.send({ embeds: [embedDM] });
                await channel.send({ content: `<@${teammitglied.id}>`, embeds: [embed] });

                interaction.reply({ content: 'Erfolgreich.', ephemeral: true });
            } else {
                interaction.reply({ content: 'Fehler beim Abrufen der Rolle.', ephemeral: true });
            }
        } else {
            interaction.reply({ content: `Du bist keine <@&${Config.Settings['Teamupdates'].Permissions}>.`, ephemeral: true });
        }
    } else if (interaction.isCommand() && interaction.commandName == 'umfrage') {
        if (interaction.member.roles.cache.has(Config.Settings['Umfrage'].Permissions) || hasAdminPermission(interaction.member)) {
            const modal = new discord.ModalBuilder().setCustomId('umfrage-modal').setTitle('Dein Text');

            const row = new discord.ActionRowBuilder().addComponents(
                new discord.TextInputBuilder()
                    .setCustomId('umfrage-text')
                    .setLabel('Dein Text')
                    .setStyle(discord.TextInputStyle.Paragraph)
                    .setRequired(true),
            );

            modal.addComponents(row);

            await interaction.showModal(modal);
        } else {
            interaction.reply({ content: `Du bist kein <@&${Config.Settings['Umfrage'].Permissions}>.`, ephemeral: true });
        }
    } else if (interaction.customId == 'umfrage-modal') {
        const text = interaction.fields.getTextInputValue('umfrage-text');

        const embed = new discord.EmbedBuilder()
            .setAuthor({
                name: Config.Settings['Name'],
                iconURL: Config.Settings['bilder'].logo,
            })
            .setColor(getRandomColor())
            .setTitle('Umfrage')
            .setDescription(
                `${text.toString()}\n\n**Mit freundlichen GrÃ¼ÃŸen,**\n<@${
                    interaction.user.id
                }> - <@&${Config.Settings['Umfrage'].Permissions}>`,
            )
            .setThumbnail(Config.Settings['bilder'].logo)
            .setTimestamp(new Date(Date.now()))
            .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() });

        const channel = interaction.guild.channels.cache.get(Config.Settings['Umfrage'].Channel);

        const msg = await channel.send({ content: "@everyone", embeds: [embed] });

        msg.react('ðŸ‘');
        msg.react('ðŸ‘Ž');

        interaction.reply({ content: 'Erfolgreich', ephemeral: true });

    } else if (interaction.isCommand() && interaction.commandName == 'team-announce') {
        if (interaction.member.roles.cache.has(Config.Settings['Teamupdates'].Permissions) || hasAdminPermission(interaction.member)) {
            const modal = new discord.ModalBuilder().setCustomId('team-announce-modal').setTitle('Dein Text');

            const row = new discord.ActionRowBuilder().addComponents(
                new discord.TextInputBuilder()
                    .setCustomId('team-announce-text')
                    .setLabel('Dein Text')
                    .setStyle(discord.TextInputStyle.Paragraph)
                    .setRequired(true),
            );

            modal.addComponents(row);

            await interaction.showModal(modal);
        } else {
            interaction.reply({ content: `Du bist kein <@&${Config.Settings['Teamupdates'].Permissions}>.`, ephemeral: true });
        }
    } else if (interaction.customId == 'team-announce-modal') {
        const text = interaction.fields.getTextInputValue('team-announce-text');

        const embed = new discord.EmbedBuilder()
            .setAuthor({
                name: Config.Settings['Name'],
                iconURL: Config.Settings['bilder'].logo,
            })
            .setColor(getRandomColor())
            .setTitle('Team AnkÃ¼ndigung')
            .setDescription(
                `${text.toString()}\n\n**Mit freundlichen GrÃ¼ÃŸen,**\n<@${
                    interaction.user.id
                }> - <@&${Config.Settings['Teamupdates'].Permissions}>`,
            )
            .setThumbnail(Config.Settings['bilder'].logo)
            .setTimestamp(new Date(Date.now()))
            .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() });

        const channel = interaction.guild.channels.cache.get('1188859519904784394');

        const msg = await channel.send({ content: "@everyone", embeds: [embed] });

        msg.react('ðŸ‘');
        msg.react('ðŸ‘Ž');

        interaction.reply({ content: 'Erfolgreich', ephemeral: true });

    } else if (interaction.isCommand() && interaction.commandName == 'team-umfrage') {
        if (interaction.member.roles.cache.has(Config.Settings['Teamupdates'].Permissions) || hasAdminPermission(interaction.member)) {
            const modal = new discord.ModalBuilder().setCustomId('team-umfrage-modal').setTitle('Dein Text');

            const row = new discord.ActionRowBuilder().addComponents(
                new discord.TextInputBuilder()
                    .setCustomId('team-umfrage-text')
                    .setLabel('Dein Text')
                    .setStyle(discord.TextInputStyle.Paragraph)
                    .setRequired(true),
            );

            modal.addComponents(row);

            await interaction.showModal(modal);
        } else {
            interaction.reply({ content: `Du bist kein <@&${Config.Settings['Teamupdates'].Permissions}>.`, ephemeral: true });
        }
    } else if (interaction.customId == 'team-umfrage-modal') {
        const text = interaction.fields.getTextInputValue('team-umfrage-text');

        const embed = new discord.EmbedBuilder()
            .setAuthor({
                name: Config.Settings['Name'],
                iconURL: Config.Settings['bilder'].logo,
            })
            .setColor(getRandomColor())
            .setTitle('Team Umfrage')
            .setDescription(
                `${text.toString()}\n\n**Mit freundlichen GrÃ¼ÃŸen,**\n<@${
                    interaction.user.id
                }> - <@&${Config.Settings['Teamupdates'].Permissions}>`,
            )
            .setThumbnail(Config.Settings['bilder'].logo)
            .setTimestamp(new Date(Date.now()))
            .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() });

        const channel = interaction.guild.channels.cache.get('1188859519904784394');

        const msg = await channel.send({ content: "@everyone", embeds: [embed] });

        msg.react('ðŸ‘');
        msg.react('ðŸ‘Ž');

        interaction.reply({ content: 'Erfolgreich', ephemeral: true });

    } else if (interaction.isCommand() && interaction.commandName == 'frak-auflosung') {
        if (interaction.member.roles.cache.has(Config.Settings['Frakupdates'].Permissions) || hasAdminPermission(interaction.member)) {
            const embed = new discord.EmbedBuilder()
                .setAuthor({
                    name: Config.Settings['Name'],
                    iconURL: Config.Settings['bilder'].logo,
                })
                .setColor(getRandomColor())
                .setTitle('Fraktions AuflÃ¶sung')
                .setDescription(
                    `Hiermit ist die Fraktion **"${interaction.options.getString(
                        'fraktion',
                    )}"** aufgelÃ¶st.\n\n**Grund:** \`${interaction.options.getString('grund')}\`\n\n**Mit freundlichen GrÃ¼ÃŸen,**\n<@${
                        interaction.user.id
                    }> - <@&${Config.Settings['Frakupdates'].Permissions}>`,
                )
                .setTimestamp(new Date(Date.now()))
                .setThumbnail(Config.Settings['bilder'].logo)
                .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() });

            const channel = interaction.guild.channels.cache.get(Config.Settings['Frakupdates'].Channel);

            await channel.send({ embeds: [embed] });

            interaction.reply({ content: 'Erfolgreich.', ephemeral: true });
        } else {
            interaction.reply({ content: `Du bist keine <@&${Config.Settings['Frakupdates'].Permissions}>.`, ephemeral: true });
        }
    } else if (interaction.isCommand() && interaction.commandName == 'frak-liste') {
        if (interaction.member.roles.cache.has(Config.Settings['Frakupdates'].Permissions) || hasAdminPermission(interaction.member)) {
            const modal = new discord.ModalBuilder().setCustomId('frak-list-modal').setTitle('Fraktions Liste');

            const row = new discord.ActionRowBuilder().addComponents(
                new discord.TextInputBuilder()
                    .setCustomId('frak-liste-staatliche')
                    .setLabel('Staatliche Fraktionen')
                    .setStyle(discord.TextInputStyle.Paragraph)
                    .setRequired(false),
            );

            const row2 = new discord.ActionRowBuilder().addComponents(
                new discord.TextInputBuilder()
                    .setCustomId('frak-liste-neutral')
                    .setLabel('Neutrale Fraktionen')
                    .setStyle(discord.TextInputStyle.Paragraph)
                    .setRequired(false),
            );

            const row3 = new discord.ActionRowBuilder().addComponents(
                new discord.TextInputBuilder()
                    .setCustomId('frak-liste-illegale')
                    .setLabel('Illegale Fraktionen')
                    .setStyle(discord.TextInputStyle.Paragraph)
                    .setRequired(false),
            );

            const row4 = new discord.ActionRowBuilder().addComponents(
                new discord.TextInputBuilder()
                    .setCustomId('frak-liste-motoradclubs')
                    .setLabel('Motorad Clubs')
                    .setStyle(discord.TextInputStyle.Paragraph)
                    .setRequired(false),
            );

            modal.addComponents(row, row2, row3, row4);

            await interaction.showModal(modal);
        } else {
            interaction.reply({ content: `Du bist keine <@&118885918${Config.Settings['Frakupdates'].Permissions}9276196904>.`, ephemeral: true });
        }
    } else if (interaction.customId == 'frak-list-modal') {
        const staatliche = interaction.fields.getTextInputValue('frak-liste-staatliche');
        const neutral = interaction.fields.getTextInputValue('frak-liste-neutral');
        const illegale = interaction.fields.getTextInputValue('frak-liste-illegale');
        const motoradclubs = interaction.fields.getTextInputValue('frak-liste-motoradclubs');

        const embed = new discord.EmbedBuilder()
            .setAuthor({
                name: Config.Settings['Name'],
                iconURL: Config.Settings['bilder'].logo,
            })
            .setColor(getRandomColor())
            .setTitle('Fraktions Liste')
            .setDescription(
                `__**STAATLICHE FRAKTIONEN**__\n${staatliche.toString()}\n\n__**NEUTRALE FRAKTIONEN**__\n${illegale.toString()}\n\n__**ILLEGALE FRAKTIONEN**__\n${neutral.toString()}\n\n__**MOTORAD CLUBS**__\n${motoradclubs.toString()}\n\n**Mit freundlichen GrÃ¼ÃŸen,**\n<@${
                    interaction.user.id
                }> - <@&${Config.Settings['Frakupdates'].Permissions}>`,
            )
            .setThumbnail(Config.Settings['bilder'].logo)
            .setTimestamp(new Date(Date.now()))
            .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() });

        const channel = interaction.guild.channels.cache.get('1275125432361947154');

        await channel.send({ embeds: [embed] });
        interaction.reply({ content: 'Erfolgreich', ephemeral: true });
    } else if (interaction.isCommand() && interaction.commandName == 'changelog') {
        if (interaction.member.roles.cache.has(Config.Settings['Frakupdates'].Permissions) || hasAdminPermission(interaction.member)) {
            const modal = new discord.ModalBuilder().setCustomId('changelog-modal').setTitle('Changelog');

            const row = new discord.ActionRowBuilder().addComponents(
                new discord.TextInputBuilder()
                    .setCustomId('changelog-hinzugefugt')
                    .setLabel('HinzugefÃ¼gt')
                    .setStyle(discord.TextInputStyle.Paragraph)
                    .setRequired(false),
            );

            const row2 = new discord.ActionRowBuilder().addComponents(
                new discord.TextInputBuilder()
                    .setCustomId('changelog-entfernt')
                    .setLabel('Entfernt')
                    .setStyle(discord.TextInputStyle.Paragraph)
                    .setRequired(false),
            );

            modal.addComponents(row, row2);

            await interaction.showModal(modal);
        } else {
            interaction.reply({ content: `Du bist keine <@&${Config.Settings['Frakupdates'].Permissions}>.`, ephemeral: true });
        }
    } else if (interaction.customId == 'changelog-modal') {
        const hinzugefugt = interaction.fields.getTextInputValue('changelog-hinzugefugt');
        const entfernt = interaction.fields.getTextInputValue('changelog-entfernt');
        const heute = new Date();
        const tag = heute.getDate().toString().padStart(2, '0');
        const monat = (heute.getMonth() + 1).toString().padStart(2, '0');
        const jahr = heute.getFullYear();

        const embed = new discord.EmbedBuilder()
            .setAuthor({
                name: Config.Settings['Name'],
                iconURL: Config.Settings['bilder'].logo,
            })
            .setColor('#3b3b3b')
            .setTitle(`Changelog vom **${tag}.${monat}.${jahr}**`)
            .setDescription(
                `${
                    hinzugefugt && hinzugefugt.toString().trim() !== '' ? `**HinzugefÃ¼gt**\n- ${hinzugefugt.toString().replace(/\n/g, '\n- ')}\n\n` : ''
                }${
                    entfernt && entfernt.toString().trim() !== '' ? `**Entfernt**\n- ${entfernt.toString().replace(/\n/g, '\n- ')}\n\n` : ''
                }**Mit freundlichen GrÃ¼ÃŸen,**\n<@${
                    interaction.user.id
                }> - <@&${Config.Settings['Frakupdates'].Permissions}>`,
            )
            .setThumbnail(Config.Settings['bilder'].logo)
            .setImage(Config.Settings['bilder'].banner)
            .setTimestamp(new Date(Date.now()))
            .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() });

        const channel = interaction.guild.channels.cache.get(Config.Settings['Frakupdates'].Channel);

        await channel.send({ content: `@everyone`, embeds: [embed] });
        interaction.reply({ content: 'Erfolgreich', ephemeral: true });
    } else if (interaction.isCommand() && interaction.commandName == 'warnung') {
        if (interaction.member.roles.cache.has(Config.Settings['Teamupdates'].Permissions) || hasAdminPermission(interaction.member)) {
            const targetUser = interaction.options.getMember('teammitglied');
            const reason = interaction.options.getString('grund');
            const option = interaction.options.getString('grund');

            if (!targetUser) {
                interaction.reply({ content: 'Du musst einen Teammitglied auswÃ¤hlen.', ephemeral: true });
                return;
            }

            const embed = new discord.EmbedBuilder()
                .setAuthor({
                    name: Config.Settings['Name'],
                    iconURL: Config.Settings['bilder'].logo,
                })
                .setColor('#8800ff')
                .setTitle('WARNUNG')
                .setDescription(`Hiermit wirst du aufgefordert ${reason} `)
                .setTimestamp(new Date(Date.now()))
                .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
                .setThumbnail(Config.Settings['bilder'].logo);

                sendLogEmbed(`<@${interaction.user.id}> hat das Teammitglied <@${targetUser.id}> per DM verwarnt.\n\n**Gesendete DM an das Teammitglied**:\n "Hiermit wirst du aufgefordert ${interaction.options.getString('grund').replace(/\*\*(.*?)\*\*/g, '$1').split('\n\n')[0]}"`, 'Blue', interaction.user);


            try {
                await targetUser.send({ embeds: [embed] });
                interaction.reply({ content: 'Du hast Erfolgreich die DM an den Teamler gesendet.', ephemeral: true });
            } catch (error) {
                console.error(`Fehler beim Senden der DM an ${targetUser.user.tag}: ${error}`);
                interaction.reply({ content: 'Fehler beim Senden der DM.', ephemeral: true });
            }
        } else {
            interaction.reply({ content: `Du bist kein <@&${Config.Settings['Teamupdates'].Permissions}>.`, ephemeral: true });
        }
    } else if (interaction.isCommand() && interaction.commandName == 'support-eintrag') {
        if (interaction.member.roles.cache.has(Config.Settings['Supporteintrag'].Permissions) || hasAdminPermission(interaction.member)) {
            const targetUser = interaction.options.getMember('spieler');
            const anliegen = interaction.options.getString('anliegen');
            const aktion = interaction.options.getString('aktion');
            const weitergeholfen = interaction.options.getString('weitergeholfen');

            if (!targetUser) {
                interaction.reply({ content: 'Du musst einen Teammitglied auswÃ¤hlen.', ephemeral: true });
                return;
            }
            const listen = loadListen();
            if (listen[interaction.user.id]) {
                listen[interaction.user.id] = {
                    data: interaction.user,
                    'eintrÃ¤ge': listen[interaction.user.id]['eintrÃ¤ge'] + 1
                };
            } else {
                listen[interaction.user.id] = {
                    data: interaction.user,
                    'eintrÃ¤ge': 1
                };
            }
            saveListen(listen);
            const embed = new discord.EmbedBuilder()
                .setAuthor({
                    name: Config.Settings['Name'],
                    iconURL: Config.Settings['bilder'].logo,
                })
                .setColor('#8800ff')
                .setTitle('Neuer Support Eintrag')
                .setDescription(`**Supporter:** <@${interaction.user.id}> \n**Spieler:** <@${targetUser.id}> \n**Anliegen:** ${anliegen} \n**Aktion:** ${aktion} \n**Weitergeholfen:** ${weitergeholfen}`)
                .setTimestamp(new Date(Date.now()))
                .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
                //.setThumbnail(Config.Settings['bilder'].logo);

                sendLogEmbed(`<@${interaction.user.id}> hat ein Eintrag Erstellt`, 'Blue', interaction.user);


            try {
                const channel = interaction.guild.channels.cache.get(Config.Settings['Supporteintrag'].Channel);

                await channel.send({ embeds: [embed] });
                interaction.reply({ content: 'Du hast Erfolgreich ein Support Eintrag Erstellt.', ephemeral: true });
            } catch (error) {
                console.error(`Fehler beim Senden der Support Eintrag von ${interaction.user.username} : ${error}`);
                interaction.reply({ content: 'Fehler beim Senden der DM.', ephemeral: true });
            }
        } else {
            interaction.reply({ content: `Du bist kein <@&${Config.Settings['Supporteintrag'].Permissions}>.`, ephemeral: true });
        }
    } else if (interaction.isCommand() && interaction.commandName == 'support-count') {
        if (interaction.member.roles.cache.has(Config.Settings['Supporteintrag'].Permissions) || hasAdminPermission(interaction.member)) {
            const targetUser = interaction.options.getMember('teamler');

            if (!targetUser) {
                interaction.reply({ content: 'Du musst einen Teammitglied auswÃ¤hlen.', ephemeral: true });
                return;
            }
            const listen = loadListen();
            if (!listen[targetUser.user.id]) {
                return interaction.reply({ content: `<@${targetUser.id}> Hat keine Support EintrÃ¤ge`, ephemeral: true });
            }
            saveListen(listen);
            const embed = new discord.EmbedBuilder()
                .setAuthor({
                    name: Config.Settings['Name'],
                    iconURL: Config.Settings['bilder'].logo,
                })
                .setColor('#8800ff')
                .setTitle('Support EintrÃ¤ge')
                .setDescription(`**Supporter:** <@${targetUser.id}>\n**Einträge** ${listen[targetUser.id]['eintrÃ¤ge']}`)
                .setTimestamp(new Date(Date.now()))
                .setFooter({ text: targetUser.user.username, iconURL: targetUser.user.displayAvatarURL() })
                .setThumbnail(Config.Settings['bilder'].logo);


            try {
                const channel = interaction.guild.channels.cache.get(Config.Settings['Supporteintrag'].Channel);

                await channel.send({ embeds: [embed] });
                interaction.reply({ content: `Du hast Erfolgreich die Support EintrÃ¤ge von <@${targetUser.id}> gechekt.`, ephemeral: true });
            } catch (error) {
                console.error(`Fehler beim Senden der Support Eintrag von ${targetUser.username} : ${error}`);
                interaction.reply({ content: 'Fehler beim Senden der DM.', ephemeral: true });
            }
        } else {
            interaction.reply({ content: `Du bist kein <@&${Config.Settings['Supporteintrag'].Permissions}>.`, ephemeral: true });
        }
    }

});

function loadListen() {
    try {
        const listen = JSON.parse(fs.readFileSync('./db/listen.json', 'utf8'));
        return listen;
    } catch (error) {
        console.error('Error while loading lists:', error);
        return {};
    }
}

function saveListen(listen) {
    try {
        fs.writeFileSync('./db/listen.json', JSON.stringify(listen, null, 4), 'utf8');
    } catch (error) {
        console.error('Error while saving lists:', error);
    }
}


client.on('error', async (error) => {
    console.log(error);
});

process.on('unhandledRejection', async (error) => {
    console.log(error);
});

process.on('uncaughtException', async (error) => {
    console.log(error);
});

client.login(Config.General['Token']);
