module.exports = {
    prefix: process.env.PREFIX || '!',
    staffRoleName: process.env.STAFF_ROLE_NAME || 'Staff',
    
    // Default character image URL
    defaultCharacterImage: 'https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/6796fe47-907a-4f6f-8075-8722ea4708d1/ddpvgse-30622ade-c990-4351-a216-47beb771d52b.png?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7InBhdGgiOiJcL2ZcLzY3OTZmZTQ3LTkwN2EtNGY2Zi04MDc1LTg3MjJlYTQ3MDhkMVwvZGRwdmdzZS0zMDYyMmFkZS1jOTkwLTQzNTEtYTIxNi00N2JlYjc3MWQ1MmIucG5nIn1dXSwiYXVkIjpbInVybjpzZXJ2aWNlOmZpbGUuZG93bmxvYWQiXX0.eX1xXIQHaHlKd7vrReTDjyRDJkHa-rr6s9VUr7-PmKg',
    
    // Available races
    races: ['Saiyan', 'Namekian', 'Synthetic Majin', 'Majin', 'Human', 'Arcosian'],
    
    // Racial abilities
    racials: {
        zenkai: {
            name: 'Zenkai',
            description: 'When in turned combat their Effective PL increases by 30% (of Base PL) per turn when facing stronger enemies. Continues until your PL equals/exceeds theirs. At ≤20% health, gains are boosted by 1.4x.',
            defaultRace: 'Saiyan',
            tag: 'zenkai'
        },
        hspirit: {
            name: 'Human Spirit',
            description: 'The reduction to maximum ki due to health loss is halved.',
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
    magicAffinities: [
        'Fire', 'Water', 'Lightning', 'Plant', 'Air', 'Earth', 'Ice', 
        'Light', 'Negative', 'Gravity', 'Illusion', 'Sealing', 
        'Biomancy', 'Time', 'Space', 'Necromancy', 'Telepathy'
    ],
    
    // Magic affinity display names (for stats display)
    magicAffinityDisplayNames: {
        'Negative': 'Negative Energy'
        // Add other mappings here if needed in the future
    },
    
    // Health bar emoji ID
    healthBarEmojiId: '1400942686495572041',
    kiBarEmojiId: '1400943268170301561'
};
