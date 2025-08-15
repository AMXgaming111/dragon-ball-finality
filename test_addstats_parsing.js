// Test script for addstats command parsing
function testAddstatsParsing(input) {
    const args = input.split(' ');
    console.log(`\nInput: ${input}`);
    console.log(`Args: [${args.map(a => `"${a}"`).join(', ')}]`);
    
    if (args.length < 3) {
        console.log('❌ Not enough arguments');
        return;
    }

    const subcommand = args[0].toLowerCase();
    if (subcommand !== 'pic') {
        console.log('❌ Invalid subcommand');
        return;
    }

    let characterName;
    let imageUrl;

    if (args[1].startsWith('"')) {
        const commandAfterPic = args.slice(1).join(' ');
        const firstQuote = commandAfterPic.indexOf('"');
        const secondQuote = commandAfterPic.indexOf('"', firstQuote + 1);
        
        if (secondQuote === -1) {
            console.log('❌ Missing closing quote!');
            return;
        }
        
        characterName = commandAfterPic.substring(firstQuote + 1, secondQuote);
        imageUrl = commandAfterPic.substring(secondQuote + 1).trim();
        
        if (!characterName || !imageUrl) {
            console.log('❌ Invalid format!');
            return;
        }
    } else {
        characterName = args[1];
        imageUrl = args[2];
    }
    
    console.log(`✅ Character Name: "${characterName}"`);
    console.log(`✅ Image URL: "${imageUrl}"`);
}

// Test cases
console.log('=== Testing Addstats Command Parsing ===');

testAddstatsParsing('pic "Kazurai Sakada" https://example.com/image.png');
testAddstatsParsing('pic "Son Goku" https://dragonball.com/goku.jpg');
testAddstatsParsing('pic Goku https://example.com/goku.png');
testAddstatsParsing('pic Piccolo https://example.com/piccolo.jpg');
testAddstatsParsing('pic "Missing quote https://example.com/image.png');
testAddstatsParsing('pic "" https://example.com/image.png');
testAddstatsParsing('pic "Valid Name"');
