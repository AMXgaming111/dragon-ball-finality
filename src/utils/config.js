// Configuration settings for Dragon Ball Finality Bot
module.exports = {
    // Basic bot configuration
    prefix: '!',
    staffRoleName: 'Staff',
    defaultCharacterImage: 'https://i.imgur.com/default.png',
    
    // Available character races
    races: ['Human', 'Saiyan', 'Arcosian', 'Namekian', 'Majin', 'Synthetic Majin'],

    // Racial stat caps for AP system
    racialCaps: {
        'Human': {
            strength: 40,
            defense: 40,
            agility: 40,
            endurance: 60,
            control: 450
        },
        'Saiyan': {
            strength: 80,
            defense: 80,
            agility: 80,
            endurance: 120,
            control: 100
        },
        'Arcosian': {
            strength: 120,
            defense: 120,
            agility: 120,
            endurance: 160,
            control: 60
        },
        'Namekian': {
            strength: 60,
            defense: 60,
            agility: 60,
            endurance: 100,
            control: 150
        },
        'Majin': {
            strength: 70,
            defense: 70,
            agility: 70,
            endurance: 90,
            control: 200
        },
        'Synthetic Majin': {
            strength: 80,
            defense: 90,
            agility: 80,
            endurance: 50,
            control: 150
        }
    },

    // Racial abilities
    racials: {
        hspirit: {
            name: 'Human Spirit',
            description: 'Can exceed normal health limitations. Does not suffer ki penalties from low health.',
            defaultRace: 'Human',
            tag: 'hspirit'
        },
        nphys: {
            name: 'Namekian Physiology',
            description: 'Can regenerate 10% of maximum health for every 5 * (100 / control) ki points. Can increase Strength and Defense by +40 at cost of 3 * (100 / Control) ki points per turn.',
            defaultRace: 'Namekian',
            tag: 'nphys'
        },
        mregen: {
            name: 'Majin Regeneration',
            description: 'Regenerates 10% of maximum health at the beginning of turn in combat. Can be increased to 20% at cost of 3 * (100 / Control) ki points per turn.',
            defaultRace: 'Synthetic Majin',
            tag: 'mregen'
        },
        aresist: {
            name: 'Arcosian Resilience',
            description: 'Debuff from ki loss is halved.',
            defaultRace: 'Arcosian',
            tag: 'aresist'
        },
        mmagic: {
            name: "Majin's Magic",
            description: 'Gain ki when damaging another character. Increase effective PL by damage dealt up to +50%.',
            defaultRace: 'Majin',
            tag: 'mmagic'
        }
    },

    // Magic affinities
    magicAffinities: {
        fire: 'Fire',
        water: 'Water', 
        earth: 'Earth',
        air: 'Air',
        light: 'Light',
        dark: 'Dark',
        lightning: 'Lightning',
        ice: 'Ice'
    },

    magicAffinityDisplayNames: {
        fire: 'Fire',
        water: 'Water',
        earth: 'Earth', 
        air: 'Air',
        light: 'Light',
        dark: 'Dark',
        lightning: 'Lightning',
        ice: 'Ice'
    }
};