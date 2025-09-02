// 🎯 UPDATED MODIFIER SYSTEM - NEW NAMING CONVENTION

console.log('🔄 MODIFIER SYSTEM UPDATED TO INTUITIVE NAMING:');

console.log('\n📋 NEW MODIFIER CATEGORIES:');

console.log('\n🆓 NO-COST DAMAGE MODIFIERS (d+/-, d*/)');
console.log('├─ ATTACK CONTEXT:');
console.log('│  ├─ Physical Attacks: d+ affects STRENGTH stat');
console.log('│  ├─ Ki Attacks: d+ affects POWER LEVEL (PL) for damage');
console.log('│  └─ Magic Attacks: d+ affects base spell power');
console.log('├─ DEFENSE CONTEXT:');
console.log('│  └─ All Defense: d+ affects DEFENSE stat');
console.log('└─ MULTIPLIERS: d*/ affects final damage/defense roll');

console.log('\n🆓 NO-COST CONTROL MODIFIERS (c+/-, c*/)');
console.log('├─ c+ affects CONTROL stat directly');
console.log('├─ Used for ki cost calculations');
console.log('├─ Affects technique costs and accuracy bonuses');
console.log('└─ c*/ multiplies control-related calculations');

console.log('\n🆓 NO-COST ACCURACY MODIFIERS (ma+/-, ma*/)');
console.log('├─ ma+ affects AGILITY for accuracy calculations only');
console.log('├─ Stacks with regular agility modifiers (a+)');
console.log('├─ Does NOT affect ki costs (unlike a+)');
console.log('└─ ma*/ multiplies final accuracy roll');

console.log('\n💰 KI-COST MODIFIERS (Original System)');
console.log('├─ a+ : Agility bonus (ki cost)');
console.log('├─ a* : Accuracy multiplier (ki cost)');
console.log('├─ e1-e5 : Effort levels (ki impact)');
console.log('└─ +/- : Attack type modifiers');

console.log('\n🎮 PRACTICAL EXAMPLES:');

console.log('\n⚔️ ATTACK EXAMPLES:');
console.log('!attack d+20 c+10 ma*2 @target');
console.log('├─ Physical: +20 STR, +10 control for costs, 2x accuracy');
console.log('└─ Ki: +20 PL damage, +10 control for costs, 2x accuracy');

console.log('\n!attack d*1.5 ma+15 c-5 e4 *2.5 @target'); 
console.log('├─ Ki Attack: 1.5x damage roll, +15 accuracy agility');
console.log('├─ -5 control (higher ki cost), effort 4, *2.5 multiplier');
console.log('└─ Complex combination: free + ki-cost modifiers');

console.log('\n🛡️ DEFENSE EXAMPLES:');
console.log('!defend d+25 ma+10 e3 @attacker');
console.log('├─ +25 defense stat for blocking');
console.log('├─ +10 agility for dodge accuracy');  
console.log('└─ Effort 3 for both calculations');

console.log('\n!defend d*2 ma*3 @attacker');
console.log('├─ 2x final defense roll (block)');
console.log('├─ 3x accuracy roll (dodge)');
console.log('└─ Pure multiplier defense - high risk/reward');

console.log('\n🔧 TECHNICAL IMPLEMENTATION:');

console.log('\n📊 STAT TARGETING LOGIC:');
console.log('MODIFIER | ATTACK TYPE | AFFECTS');
console.log('======== | =========== | =======');
console.log('d+/-     | Physical    | Strength stat');
console.log('d+/-     | Ki Attack   | Power Level (PL)');
console.log('d+/-     | Magic       | Spell power');
console.log('d+/-     | Defense     | Defense stat');
console.log('c+/-     | All         | Control stat');
console.log('ma+/-    | All         | Agility (accuracy only)');

console.log('\n⚡ CALCULATION ORDER:');
console.log('1. Base stat + modifier (d+ or c+)');
console.log('2. Calculate base damage/defense/accuracy');
console.log('3. Apply effort level');
console.log('4. Apply final multipliers (d*/, c*/, ma*/)');
console.log('5. Apply ki costs (for paid modifiers only)');

console.log('\n✅ COMPATIBILITY MATRIX:');
console.log('MODIFIER TYPE | FREE COST | KI COST | STACKABLE');
console.log('============= | ========= | ======= | =========');
console.log('d+/-, d*/     | ✅ Free   | ❌ No   | ✅ Yes');
console.log('c+/-, c*/     | ✅ Free   | ❌ No   | ✅ Yes');  
console.log('ma+/-, ma*/   | ✅ Free   | ❌ No   | ✅ Yes');
console.log('a+, a*        | ❌ No     | ✅ Yes  | ✅ Yes');
console.log('e1-e5         | ❌ No     | ⚖️ Mixed | ❌ No');

console.log('\n🎯 DESIGN BENEFITS:');
console.log('✅ Intuitive: d=damage, c=control, ma=accuracy');
console.log('✅ Context-Smart: Same modifier works across all combat');
console.log('✅ Free Experimentation: No ki cost for strategic testing');
console.log('✅ Backward Compatible: All old modifiers still work');
console.log('✅ Flexible: Mix free + paid modifiers for complexity');

console.log('\n🚀 SYSTEM STATUS: UPDATED AND OPERATIONAL!');
console.log('Ready for testing with new intuitive modifier names.');
