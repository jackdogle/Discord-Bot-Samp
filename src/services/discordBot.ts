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
      }
    });
  }

  private async registerCommands() {
    const commands = [
      new SlashCommandBuilder().setName('status').setDescription('Get SA-MP server status'),
      new SlashCommandBuilder().setName('players').setDescription('List online players'),
      new SlashCommandBuilder().setName('lookup').setDescription('Lookup player stats')
        .addStringOption(option => option.setName('name').setDescription('Player name').setRequired(true)),
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
