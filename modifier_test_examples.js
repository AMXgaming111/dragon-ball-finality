// Examples of the new modifier system implementation

console.log('🎯 New Modifier System Examples\n');

console.log('📋 BASIC USAGE:');
console.log('• !attack @user                    - Basic attack');
console.log('• !attack e4 @user                 - High effort attack');
console.log('• !attack a+10 @user               - +10 agility (ki cost)');
console.log('• !attack a*2 @user                - 2x accuracy (ki cost)');

console.log('\n🆓 NO-COST MODIFIERS:');
console.log('Main Stat Modifiers (m):');
console.log('• !attack m+15 @user               - +15 to strength (physical) or control (ki)');
console.log('• !attack m-5 @user                - -5 to main stat');
console.log('• !attack m*1.5 @user              - 1.5x final damage roll');
console.log('• !attack m/2 @user                - Divide final damage by 2');

console.log('\nAccuracy-Only Modifiers (ma):');
console.log('• !attack ma+20 @user              - +20 agility for accuracy only');
console.log('• !attack ma-10 @user              - -10 agility for accuracy only');
console.log('• !attack ma*3 @user               - 3x accuracy roll');
console.log('• !attack ma/1.5 @user             - Divide accuracy by 1.5');

console.log('\n🔥 COMPLEX COMBINATIONS:');
console.log('• !attack e4 a+10 ma*2 m+10 @user  - High effort + agility bonus + 2x accuracy + strength boost');
console.log('• !attack e1 m-5 ma+15 @user       - Low effort + stat penalty + accuracy agility boost');
console.log('• !attack m*2 ma/2 @user           - Double damage, half accuracy');

console.log('\n🛡️ DEFEND EXAMPLES:');
console.log('• !defend @attacker                - Basic defense');
console.log('• !defend e3 m+20 @attacker        - Medium effort + defense boost');
console.log('• !defend ma+10 m*1.5 @attacker    - Accuracy agility + roll multiplier');

console.log('\n⚡ KEY FEATURES:');
console.log('• m/ma modifiers cost NO ki');
console.log('• m affects main stat (STR for physical, CON for ki, DEF for defend)');
console.log('• ma only affects agility for accuracy calculations');
console.log('• All existing modifiers (a+, a*, e) still work normally');
console.log('• Can combine all modifier types in one command');

console.log('\n🎮 IMPLEMENTATION STATUS:');
console.log('✅ Attack command modifier parsing');
console.log('✅ Physical attack integration');
console.log('✅ Ki attack integration');
console.log('✅ Defend command modifier parsing');
console.log('🔄 Defense calculation integration (in progress)');
console.log('🔄 Magic attack integration (in progress)');
console.log('🔄 Technique system integration (in progress)');
