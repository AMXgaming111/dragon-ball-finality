// Configuration settings for Dragon Ball Finality Bot
module.exports = {
    // Basic bot configuration
    prefix: '!',
    staffRoleName: 'Staff',
    defaultCharacterImage: 'https://i.imgur.com/default.png',

    // Available races (including variants)
    races: ['Saiyan', 'Namekian', 'Synthetic Majin', 'Majin', 'Human', 'Arcosian', 'Otherworlder', 'Monster', 'Beastmen'],

    // Racial variants mapping (variant -> primary race)
    racialVariants: {
        'Otherworlder': 'Human',
        'Monster': 'Majin', 
        'Beastmen': 'Human'
    },

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
        },
        // Racial Variants
        'Otherworlder': {
            strength: 50,
            defense: 50,
            agility: 50,
            endurance: 50,
            control: 100
        },
        'Monster': {
            strength: 80,
            defense: 90,
            agility: 80,
            endurance: 100,
            control: 120
        },
        'Beastmen': {
            strength: 60,
            defense: 60,
            agility: 60,
            endurance: 90,
            control: 100
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
        },
        // Racial Variant Specials
        nothingspecial: {
            name: 'Nothing Special',
            description: 'Your specialization increases your stats from +20% to +80% for your primary and from 10% to 40% for your secondary.',
            defaultRace: 'Otherworlder',
            tag: 'nothingspecial'
        }
    },

    // Innate States (automatic states that trigger under certain conditions)
    innateStates: {
        survivalresponse: {
            name: 'Survival Response',
            description: 'x1.3 Strength, Defense, and Agility. Control is lowered by 25% and the user gains back 5% of their ki per turn.',
            trigger: 'health_50_percent',
            defaultRace: 'Beastmen',
            modifiers: {
                strength_modifier: '*1.3',
                defense_modifier: '*1.3', 
                agility_modifier: '*1.3',
                control_modifier: '*0.75',
                ki_regen: '+5%'
            },
            tag: 'survivalresponse'
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