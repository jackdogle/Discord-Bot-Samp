import { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes } from 'discord.js';
import query from 'samp-query';
import { getDb } from './db';

export class DiscordBot {
  private client: Client;
  private token: string;

  constructor() {
    this.token = process.env.DISCORD_TOKEN || '';
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.setupHandlers();
  }

  private setupHandlers() {
    this.client.once('ready', () => {
      console.log(`Logged in as ${this.client.user?.tag}!`);
      this.registerCommands();
    });

    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      const { commandName } = interaction;

      if (commandName === 'status') {
        await this.handleStatus(interaction);
      } else if (commandName === 'players') {
        await this.handlePlayers(interaction);
      } else if (commandName === 'lookup') {
        await this.handleLookup(interaction);
      } else if (commandName === 'ban') {
        await this.handleBan(interaction);
      }
    });
  }

  private async registerCommands() {
    const commands = [
      new SlashCommandBuilder().setName('status').setDescription('Get SA-MP server status'),
      new SlashCommandBuilder().setName('players').setDescription('List online players'),
      new SlashCommandBuilder().setName('lookup').setDescription('Lookup player stats')
        .addStringOption(option => option.setName('name').setDescription('Player name').setRequired(true)),
      new SlashCommandBuilder().setName('ban').setDescription('Ban a player from the server')
        .addStringOption(option => option.setName('player').setDescription('Player name or ID').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Reason for the ban').setRequired(false)),
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(this.token);

    try {
      if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_GUILD_ID) {
        await rest.put(
          Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
          { body: commands },
        );
        console.log('Successfully reloaded application (/) commands.');
      }
    } catch (error) {
      console.error(error);
    }
  }

  private async handleStatus(interaction: any) {
    const ip = process.env.SAMP_IP || '167.71.197.62';
    const port = parseInt(process.env.SAMP_PORT || '7003');

    query({ host: ip, port }, (err, response) => {
      if (err) {
        return interaction.reply({ content: 'Server is offline or unreachable.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle(response.hostname)
        .setColor(0x00AE86)
        .addFields(
          { name: 'Gamemode', value: response.gamemode, inline: true },
          { name: 'Map', value: response.mapname, inline: true },
          { name: 'Players', value: `${response.online}/${response.maxplayers}`, inline: true },
          { name: 'IP', value: `${ip}:${port}`, inline: true },
        )
        .setTimestamp();

      interaction.reply({ embeds: [embed] });
    });
  }

  private async handlePlayers(interaction: any) {
    const ip = process.env.SAMP_IP || '167.71.197.62';
    const port = parseInt(process.env.SAMP_PORT || '7003');

    query({ host: ip, port }, (err, response) => {
      if (err || !response.players) {
        return interaction.reply({ content: 'Could not fetch player list.', ephemeral: true });
      }

      const playerList = response.players.map(p => `[${p.id}] ${p.name} (Score: ${p.score})`).join('\n') || 'No players online.';
      
      const embed = new EmbedBuilder()
        .setTitle(`Online Players (${response.online}/${response.maxplayers})`)
        .setDescription(`\`\`\`\n${playerList.substring(0, 2000)}\n\`\`\``)
        .setColor(0x3498DB);

      interaction.reply({ embeds: [embed] });
    });
  }

  private async handleLookup(interaction: any) {
    const name = interaction.options.getString('name');
    try {
      const db = await getDb();
      // Assuming a standard LRP table structure: 'players' table with 'Username', 'Level', 'AdminLevel', etc.
      const [rows]: any = await db.execute('SELECT * FROM players WHERE Username = ? LIMIT 1', [name]);

      if (rows.length === 0) {
        return interaction.reply({ content: `Player "${name}" not found in database.`, ephemeral: true });
      }

      const player = rows[0];
      
      // Try to find admin level from common column names
      const adminLevel = player.AdminLevel ?? player.Admin ?? player.pAdmin ?? player.LevelAdmin ?? player.admin ?? 0;
      const money = player.Money ?? player.pCash ?? player.Cash ?? 0;
      const level = player.Level ?? player.pLevel ?? 0;

      const embed = new EmbedBuilder()
        .setTitle(`Player Profile: ${player.Username}`)
        .setColor(0xE67E22)
        .addFields(
          { name: 'Level', value: String(level), inline: true },
          { name: 'Admin Level', value: String(adminLevel), inline: true },
          { name: 'Money', value: `$${money}`, inline: true },
          { name: 'Last Login', value: player.LastLogin || player.LastLog || 'Unknown', inline: true },
        )
        .setTimestamp();

      interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      interaction.reply({ content: 'An error occurred while accessing the database.', ephemeral: true });
    }
  }

  private async handleBan(interaction: any) {
    const adminRole = process.env.DISCORD_ADMIN_ROLE;
    
    // Check if user has the admin role (if configured)
    if (adminRole && interaction.member && interaction.member.roles) {
      if (!interaction.member.roles.cache.has(adminRole)) {
        return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      }
    } else if (adminRole) {
      // If we can't verify roles but an admin role is required
      return interaction.reply({ content: 'Could not verify your roles. Please use this command in a server.', ephemeral: true });
    }

    const playerInput = interaction.options.getString('player');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const adminName = interaction.user.tag;

    try {
      const db = await getDb();
      
      // Check if player exists by name or ID
      const isNumeric = !isNaN(Number(playerInput));
      const queryStr = isNumeric 
        ? 'SELECT * FROM players WHERE Username = ? OR id = ? LIMIT 1'
        : 'SELECT * FROM players WHERE Username = ? LIMIT 1';
      const queryParams = isNumeric ? [playerInput, Number(playerInput)] : [playerInput];

      const [rows]: any = await db.execute(queryStr, queryParams);

      if (rows.length === 0) {
        return interaction.reply({ content: `Player "${playerInput}" not found in database.`, ephemeral: true });
      }

      const targetPlayer = rows[0];
      const targetName = targetPlayer.Username || targetPlayer.Name;

      // Try to update ban status. Different gamemodes use different columns.
      let banSuccess = false;
      const banColumns = ['Banned', 'pBanned', 'Ban', 'IsBanned'];
      
      for (const col of banColumns) {
        try {
          await db.execute(`UPDATE players SET ${col} = 1 WHERE Username = ?`, [targetName]);
          banSuccess = true;
          break;
        } catch (e: any) {
          if (e.code === 'ER_BAD_FIELD_ERROR') continue;
          throw e;
        }
      }

      // Optionally, try to insert into a bans table if it exists
      try {
        await db.execute(
          'INSERT INTO bans (Username, Admin, Reason, Date) VALUES (?, ?, ?, NOW())',
          [targetName, adminName, reason]
        );
      } catch (e: any) {
        // Ignore if bans table doesn't exist or has different structure
      }

      if (banSuccess) {
        const embed = new EmbedBuilder()
          .setTitle('Player Banned')
          .setColor(0xE74C3C)
          .addFields(
            { name: 'Player', value: targetName, inline: true },
            { name: 'Admin', value: adminName, inline: true },
            { name: 'Reason', value: reason, inline: false }
          )
          .setTimestamp();

        interaction.reply({ embeds: [embed] });
      } else {
        interaction.reply({ content: `Found player ${targetName}, but could not determine the correct ban column in the database (tried: ${banColumns.join(', ')}).`, ephemeral: true });
      }

    } catch (error) {
      console.error('Ban command error:', error);
      interaction.reply({ content: 'An error occurred while accessing the database.', ephemeral: true });
    }
  }

  async start() {
    if (!this.token) {
      console.warn('DISCORD_TOKEN not provided. Bot will not start.');
      return;
    }
    try {
      await this.client.login(this.token);
    } catch (error) {
      console.error('Failed to login to Discord:', error);
    }
  }
}
