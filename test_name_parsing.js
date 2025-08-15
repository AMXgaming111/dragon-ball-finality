// Test script for character name parsing
function testNameParsing(input) {
    const args = input.split(' ');
    console.log(`\nInput: ${input}`);
    console.log(`Args: [${args.map(a => `"${a}"`).join(', ')}]`);
    
    let characterName;
    let raceName;
    
    if (args[0].startsWith('"')) {
        const fullCommand = args.join(' ');
        const firstQuote = fullCommand.indexOf('"');
        const secondQuote = fullCommand.indexOf('"', firstQuote + 1);
        
        if (secondQuote === -1) {
            console.log('❌ Missing closing quote!');
            return;
        }
        
        characterName = fullCommand.substring(firstQuote + 1, secondQuote);
        raceName = fullCommand.substring(secondQuote + 1).trim();
        
        if (!characterName || !raceName) {
            console.log('❌ Invalid format!');
            return;
        }
    } else {
        characterName = args[0];
        raceName = args.slice(1).join(' ');
    }
    
    console.log(`✅ Character Name: "${characterName}"`);
    console.log(`✅ Race Name: "${raceName}"`);
}

// Test cases
console.log('=== Testing Character Name Parsing ===');

testNameParsing('"Kazurai Sakada" saiyan');
testNameParsing('"Son Goku" human');
testNameParsing('"Vegeta Prince" saiyan elite');
testNameParsing('Goku saiyan');
testNameParsing('Piccolo namekian');
testNameParsing('"Missing quote saiyan');
testNameParsing('"" saiyan');
testNameParsing('"Valid Name"');
