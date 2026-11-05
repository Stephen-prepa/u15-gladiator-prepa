// Prépa U15 HBCCS — js/03-seances-base.js — dernière modification : version z23 (05/11/2026)
// ===================== SESSION BUILDER HELPERS =====================
function circuitWarmup(tours, exDur, restDur, exList) {
  const steps = [];
  for (let t = 1; t <= tours; t++) {
    steps.push({type:'info', name:'Échauffement — Tour ' + t + '/' + tours, detail:'Enchaîner sans pause', duration:4});
    exList.forEach((ex, i) => steps.push({type:'exo', name:ex, detail:'Tour ' + t + '/' + tours + ' · Ex ' + (i+1) + '/' + exList.length, duration:exDur}));
    if (t < tours) steps.push({type:'repos', name:'Repos entre tours', detail:'Tour ' + (t+1) + ' dans...', duration:restDur});
  }
  return steps;
}
function explo(series, exList, restDur) {
  const steps = [];
  for (let s = 1; s <= series; s++) {
    steps.push({type:'info', name:'Explosivité — Série ' + s + '/' + series, detail: s===series ? 'Dernière série !' : '', duration:4});
    exList.forEach(([n,det,d]) => steps.push({type:'exo', name:n, detail:det||'', duration:d}));
    if (s < series) steps.push({type:'repos', name:'Récupération', detail:'Série ' + (s+1) + ' dans...', duration:restDur});
  }
  return steps;
}
function gainage(tours, exList, restDur) {
  const steps = [];
  for (let t = 1; t <= tours; t++) {
    steps.push({type:'info', name:'Gainage — Tour ' + t + '/' + tours, detail: t===tours ? 'Dernier tour !' : '', duration:4});
    exList.forEach(([n,d]) => {
      if (n==='T') return; // plus besoin d'etape a part, le delai est integre au debut de l'exercice suivant
      steps.push({type:'exo', name:n, detail:'', duration:d});
    });
    if (t < tours) steps.push({type:'repos', name:'Repos entre tours', detail:'Tour ' + (t+1) + ' dans...', duration:restDur});
  }
  return steps;
}
function renfoGainage(series, exList, restDur) {
  const steps = [];
  for (let s = 1; s <= series; s++) {
    steps.push({type:'info', name:'Renfo & Gainage — Série ' + s + '/' + series, detail: s===series ? 'Dernière série !' : 'Renfo + Gainage alternés', duration:4});
    exList.forEach(([n,d,det]) => steps.push({type:'exo', name:n, detail:det||'', duration:d}));
    if (s < series) steps.push({type:'repos', name:'Récupération', detail:'Série ' + (s+1) + ' dans...', duration:restDur});
  }
  return steps;
}
function circuitIntense(tours, exList, restDur) {
  const steps = [];
  for (let t = 1; t <= tours; t++) {
    steps.push({type:'info', name:'Circuit intensif — Tour ' + t + '/' + tours, detail: t===tours ? 'Dernier tour !' : 'Le pic d\'intensite de la semaine', duration:4});
    exList.forEach(([n,det,d]) => steps.push({type:'exo', name:n, detail:det||'', duration:d}));
    if (t < tours) steps.push({type:'repos', name:'Récupération entre tours', detail:'Tour ' + (t+1) + ' dans...', duration:restDur});
  }
  return steps;
}
function cardioInter(reps, effortDur, restDur, exNames, restName, announceDurations = true, introOnly = false, introKey = null) {
  const names = (exNames && exNames.length) ? exNames : ['Sprint sur place'];
  const rName = restName || 'Récupération';
  const steps = [];
  if (introOnly) {
    const introText = reps + ' × ' + effortDur + ' secondes ' + names[0].toLowerCase() + ', ' + restDur + ' secondes de ' + rName.toLowerCase() + ' entre chaque';
    steps.push({type:'info', name: introText, duration:4, audioKey: introKey});
  } else {
    steps.push({type:'info', name:'Cardio intermittent', detail: reps + ' x ' + effortDur + '/' + restDur + ' sec', duration:3});
  }
  for (let i = 1; i <= reps; i++) {
    const exName = names[(i - 1) % names.length];
    steps.push({type:'exo', name:exName, detail:'Effort ' + i + '/' + reps, duration:effortDur, announceDuration: (!introOnly && announceDurations) ? effortDur : null, noDelay:true});
    steps.push({type:'repos', name:rName, detail:'', duration:restDur, announceDuration: (!introOnly && announceDurations) ? restDur : null});
  }
  return steps;
}

function cardioInterSplit(repsPerBlock, effortDur, restDur, bigRestDur, exNames) {
  return [
    ...cardioInter(repsPerBlock, effortDur, restDur, exNames),
    {type:'repos', name:'Récupération complète', detail:'Repos long avant la 2e série', duration: bigRestDur},
    ...cardioInter(repsPerBlock, effortDur, restDur, exNames),
  ];
}

// ===================== EXERCISE CONFIGS =====================
const CW_S1 = ['Corde a sauter','Montees de genoux','Pas chasses lateraux','Talons-fesses'];
const CW_S2 = ['Corde a sauter','Montees de genoux','Pas chasses lateraux','Talons-fesses','Sauts pieds joints'];
const CW_S3 = ['Corde a sauter','Montees de genoux','Pas chasses lateraux','Talons-fesses','Squats sautes legers'];

const GDyn_S1 = [['Planche toucher epaule',30],['T',3],['Bear crawl',30],['T',3],['Mountain climbers lents',30],['T',3],['Gainage lateral droit',20],['T',3],['Gainage lateral gauche',20]];
const GDyn_S2 = [['Planche toucher epaule',40],['T',3],['Bear crawl',40],['T',3],['Mountain climbers lents',40],['T',3],['Gainage lateral rotation droit',30],['T',3],['Gainage lateral rotation gauche',30]];
const GDyn_S3 = [['Planche toucher epaule',45],['T',3],['Bear crawl',45],['T',3],['Mountain climbers lents',45],['T',3],['Gainage lateral rotation droit',35],['T',3],['Gainage lateral rotation gauche',35]];
const GDyn_S4 = [['Planche toucher epaule',40],['T',3],['Bear crawl',40],['T',3],['Gainage lateral droit',30],['T',3],['Gainage lateral gauche',30]];

// S1: x5/x6/x4 explo, S2: x6/x8/x5 + haies, S3: x8/x10/x6 + sauts lat, S4: x6/x8/x4
const Explo_S1 = [['Squats sautes x5','Descente lente, montee explosive',38],['Fentes sautees x6','3 par jambe, switch rapide',35],['Demarrages explosifs x4','Signal sonore, sprint 5m',33]];
const Explo_S2 = [['Squats sautes x6','Descente lente + remontee en saut rapide + reception lente bien amortie avec les genoux',22],['Fentes sautees x8','Descente lente + remontee en saut rapide + reception lente bien amortie avec les genoux — 4 par jambe',22],['Demarrages explosifs x5','Aller/retour = 1 fois — le changement de direction et les 1ers appuis sont ce qui compte',40],['Sauts groupes x10','Reperes au sol',32]];
const Explo_S3 = [['Squats sautes x8','Descente lente en 3 sec, remontee explosive en 1 sec',42],['Fentes sautees x10','5 par jambe',42],['Demarrages explosifs x6','Positions variees',42],['Skater jumps legers','Sauts d\'une jambe a l\'autre, reception equilibree',36]];
const Explo_S4 = [['Squats sautes x6','',38],['Fentes sautees x8','4 par jambe — maintien',36],['Demarrages explosifs x4','',33]];

// Renfo+Gainage alternés: [name, duration, detail]
const RG_S1 = [
  ['Squats x8','40','Descente 3 sec, montee 2 sec'],['Planche 30 sec','30','Respiration controlee'],
  ['Pompes x6','28','Corps aligne, coudes a 45'],['Dead bug 25 sec','25','Bas du dos colle au sol'],
  ['Fentes marchees x6','28','3 par jambe'],
  ['Gainage lateral droit 20 sec','20',''],['Gainage lateral gauche 20 sec','20',''],
  ['Y-T-W x8','28','6 a 8 reps de chaque lettre, maintien 2 sec'],['Bear Hold toucher epaule 20 sec','20','Genoux decolles, hanches basses'],
  ['Hip thrust x12','35','Fessiers serres 1 sec'],
];
const RG_S2 = [
  ['Squats','45','Tempo lent : 3 sec descente, 2 sec montee'],['Planche','40',''],
  ['Pompes','35','Rythme controle'],['Dead bug','35',''],
  ['Fentes marchees','35','Tempo lent, alterner les jambes'],
  ['Gainage lateral droit','30',''],['Gainage lateral gauche','30',''],
  ['Y-T-W','35',''],['Bear Hold toucher epaule','30',''],
  ['Hip thrust','40','Fessiers serres 1 sec en haut'],['Abdos','40','Montee 2 sec, descente 3 sec'],
];
const RG_S3 = [
  ['Squats x10','42',''],['Planche 40 sec','40',''],
  ['Pompes x8','30',''],['Dead bug 35 sec','35',''],
  ['Fentes elastique x10','38','5 par jambe'],['Gainage lateral droit 25 sec','25',''],['Gainage lateral gauche 25 sec','25',''],
  ['Dips x10','32',''],['Superman 25 sec','25',''],
  ['Hip thrust x14','38',''],
];
const RG_S4 = [
  ['Squats x8','40','Maintien'],['Planche 35 sec','35',''],
  ['Pompes x6','28',''],['Dead bug 30 sec','30',''],
  ['Fentes elastique x8','32','4 par jambe'],
  ['Gainage lateral droit 20 sec','20',''],['Gainage lateral gauche 20 sec','20',''],
  ['Y-T-W x8','28',''],['Bear Hold toucher epaule 20 sec','20',''],
  ['Hip thrust x12','35',''],
];

// Fix RG arrays: duration is string, convert
[RG_S1, RG_S2, RG_S3, RG_S4].forEach(arr => {
  arr.forEach(ex => { ex[1] = parseInt(ex[1]); });
});

// Circuit intensif S3-C — fusion renfo+gainage+explosivite en UN seul circuit (4 tours)
const CI_S3 = [
  ['Squats sautes x8','Descente lente, montee explosive',42],
  ['Fentes alternees x10','5 par jambe',42],
  ['Pompes x10','',38],
  ['Mountain climbers x24','',40],
  ['Hip thrust x14','Fessiers serres 1 sec',42],
  ['Gainage lateral droit','',30],
  ['Gainage lateral gauche','',30],
];

// ===================== EXERCISE CONFIGS — GARDIEN DE BUT =====================
const GDyn_S1_GB = [['Planche extension bras alternee',30],['T',3],['Bear crawl lateral',30],['T',3],['Gainage lateral bras tendu droit',20],['T',3],['Gainage lateral bras tendu gauche',20]];
const GDyn_S2_GB = [['Planche extension bras alternee',40],['T',3],['Bear crawl lateral',40],['T',3],['Gainage lateral rotation bras tendu droit',30],['T',3],['Gainage lateral rotation bras tendu gauche',30]];
const GDyn_S3_GB = [['Planche extension bras alternee',45],['T',3],['Bear crawl lateral',45],['T',3],['Gainage lateral rotation bras tendu droit',35],['T',3],['Gainage lateral rotation bras tendu gauche',35]];
const GDyn_S4_GB = [['Planche extension bras alternee',40],['T',3],['Bear crawl lateral',40],['T',3],['Gainage lateral bras tendu droit',30],['T',3],['Gainage lateral bras tendu gauche',30]];

const Explo_S1_GB = [['Squats sautes bras hauts x5','Extension complete des bras en l\'air',38],['Fentes laterales explosives x6','3 par cote, appui-poussee',35],['Departs reactifs ligne de but x4','Signal sonore, 2-3m gauche/droite',33]];
const Explo_S2_GB = [['Squats sautes bras hauts x6','Focus rebond au sol',44],['Fentes laterales explosives x8','4 par cote',42],['Departs reactifs ligne de but x5','Varier les positions',40],['Sauts pieds joints largeur cage x10','Reperes au sol',32]];
const Explo_S3_GB = [['Squats sautes bras hauts x8','',46],['Fentes laterales explosives x10','5 par cote',46],['Departs reactifs ligne de but x6','Positions variees',42],['Skater jumps legers','Sauts d\'une jambe a l\'autre, reception equilibree',36]];
const Explo_S4_GB = [['Squats sautes bras hauts x6','',38],['Fentes laterales explosives x8','4 par cote — maintien',36],['Departs reactifs ligne de but x4','',33]];

const RG_S1_GB = [
  ['Squats sumo x8','40','Posture large, descente 3 sec'],['Planche extension bras 30 sec','30','Position de plongeon'],
  ['Pompes explosives x6','28','Mains decollent — puissance bras'],['Dead bug 25 sec','25','Bas du dos colle au sol'],
  ['Fentes laterales bras haut x6','28','3 par cote'],
  ['Gainage lateral bras tendu droit 20 sec','20',''],['Gainage lateral bras tendu gauche 20 sec','20',''],
  ['Y-T-W + maintien 3 sec x8','28','Renfo epaule/coiffe'],['Bear Hold toucher epaule 20 sec','20','Genoux decolles, hanches basses'],
  ['Hip thrust station debout sur un pied x12','35','Alterne, fessiers serres 1 sec'],
];
const RG_S2_GB = [
  ['Squats sumo','45','Posture large'],['Planche extension bras','40',''],
  ['Pompes explosives','35',''],['Dead bug','35',''],
  ['Fentes laterales marchees','35','Tempo lent, alterner les cotes'],
  ['Gainage lateral bras tendu droit','30',''],['Gainage lateral bras tendu gauche','30',''],
  ['Y-T-W + maintien','35',''],['Bear Hold toucher epaule','30',''],
  ['Hip thrust station debout sur un pied','40','Alterne'],['Abdos','40','Montee 2 sec, descente 3 sec'],
];
const RG_S3_GB = [
  ['Squats sumo x10','42',''],['Planche extension bras 40 sec','40',''],
  ['Pompes explosives x8','30',''],['Dead bug 35 sec','35',''],
  ['Fentes laterales elastique x10','38','5 par cote'],['Gainage lateral bras tendu droit 25 sec','25',''],['Gainage lateral bras tendu gauche 25 sec','25',''],
  ['Dips x10','32',''],['Superman 25 sec','25',''],
  ['Hip thrust station debout sur un pied x14','38','Alterne'],
];
const RG_S4_GB = [
  ['Squats sumo x8','40','Maintien'],['Planche extension bras 35 sec','35',''],
  ['Pompes explosives x6','28',''],['Dead bug 30 sec','30',''],
  ['Fentes laterales elastique x8','32','4 par cote'],
  ['Gainage lateral bras tendu droit 20 sec','20',''],['Gainage lateral bras tendu gauche 20 sec','20',''],
  ['Y-T-W + maintien 3 sec x8','28',''],['Bear Hold toucher epaule 20 sec','20',''],
  ['Hip thrust station debout sur un pied x12','35','Alterne'],
];
[RG_S1_GB, RG_S2_GB, RG_S3_GB, RG_S4_GB].forEach(arr => {
  arr.forEach(ex => { ex[1] = parseInt(ex[1]); });
});

const CI_S3_GB = [
  ['Squats sautes bras hauts x8','Extension complete des bras',42],
  ['Fentes laterales explosives x10','5 par cote',42],
  ['Pompes explosives x10','',38],
  ['Hip thrust station debout sur un pied x14','Alterne, fessiers serres 1 sec',42],
  ['Gainage lateral bras tendu droit','',30],
  ['Gainage lateral bras tendu gauche','',30],
];

// ===================== SÉANCE MAISON EXCEPTIONNELLE (intempéries) =====================
// Sans matériel obligatoire — corde à sauter / élastique en option seulement.
// 4 volets : échauffement cardio, renfo membre inférieur, renfo membre supérieur, gainage, finisher cardio.
function customBlock(label, series, exList, restDur) {
  const steps = [];
  for (let s = 1; s <= series; s++) {
    steps.push({type:'info', name: label + ' — Série ' + s + '/' + series, detail: s===series ? 'Dernière série !' : '', duration:4});
    exList.forEach(([n,det,d]) => steps.push({type:'exo', name:n, detail:det||'', duration:d}));
    if (s < series) steps.push({type:'repos', name:'Récupération', detail:'Série ' + (s+1) + ' dans...', duration:restDur});
  }
  return steps;
}
const CW_HOME5 = ['Montees de genoux','Pas chasses lateraux','Talons-fesses','Sauts pieds joints','Squats sautes legers'];
const LOWER_HOME = [
  ['Squats sautes x10','Descente lente 3 sec, montee explosive',40],
  ['Fentes sautees x10','5 par jambe',40],
  ['Squats sumo x12','Posture large, descente lente',38],
  ['Hip thrust x16','Fessiers serres 1 sec en haut',38],
];
const UPPER_HOME = [
  ['Pompes x10','Coudes a 45, corps aligne',36],
  ['Dips x12','Sur chaise ou canape bas',34],
  ['Pompes mains larges x8','Variante explosive si possible',34],
  ['Y-T-W x10','Renfo epaule / coiffe, maintien 2 sec',30],
];
const CORE_HOME = [
  ['Planche 40 sec','Corps aligne, respiration controlee',40],
  ['Gainage lateral droit 25 sec','',25],
  ['Gainage lateral gauche 25 sec','',25],
  ['Dead bug 30 sec','Bas du dos colle au sol',30],
  ['Mountain climbers x24','Rythme soutenu',30],
];
// Variante (séance maison #2) — mêmes volets, exercices différents pour ne pas répéter la précédente.
const CW_HOME5_V2 = ['Jumping jacks','Talons-fesses rapides','Pas chasses croises','Skipping sur place','Squats + rotation des bras'];
const LOWER_HOME_V2 = [
  ['Squats bulgares x10','Pied arriere sur une chaise, 5 par jambe',40],
  ['Fentes avant alternees x12','Descente controlee, genou pres du sol',40],
  ['Chaise (wall sit) 30 sec','Dos colle au mur, cuisses a 90',30],
  ['Montees sur un step/marche x16','8 par jambe, pousse sur le talon',38],
];
const UPPER_HOME_V2 = [
  ['Pompes diamant x8','Mains rapprochees sous le sternum',36],
  ['Pompes prise large x10','Coudes ouverts, poitrine basse',34],
  ['Superman x12','Releve bras + jambes, maintien 1 sec',32],
  ['Triceps dips releves x10','Pieds surélevés si possible',32],
];
const CORE_HOME_V2 = [
  ['Gainage dynamique (toe touch) x20','Allonge, releve jambes + mains vers les pieds',35],
  ['Crunchs velo x20','Coude vers genou oppose, rythme controle',32],
  ['Superman maintien 30 sec','Bas du dos, gainage complet',30],
  ['Planche avec touches d\'epaule x20','Planche haute, touche l\'epaule opposee',30],
];

// ===================== SESSIONS =====================
function buildSessions(role) {
  const gb = role === 'gb';
  const sessions = {
  'SM1': { name:'Séance maison — Renfo complet & Cardio (intempéries)', duration:0, steps:[
    {type:'info', name:'Échauffement', detail:'', duration:4},
    ...circuitWarmup(2, 40, 60, CW_HOME5),
    {type:'repos', name:'Transition — Renfo membre inférieur', detail:'Prepare-toi', duration:20},
    ...customBlock('Renfo — Membre inférieur', 3, LOWER_HOME, 75),
    {type:'repos', name:'Transition — Renfo membre supérieur', detail:'Prepare-toi', duration:20},
    ...customBlock('Renfo — Membre supérieur', 3, UPPER_HOME, 70),
    {type:'repos', name:'Transition — Gainage', detail:'Prepare-toi', duration:20},
    ...customBlock('Gainage', 3, CORE_HOME, 65),
    {type:'repos', name:'Transition — Cardio', detail:'Dernier effort', duration:20},
    ...cardioInter(10, 25, 15, ['Squat jumps legers', 'Skater jumps legers', 'High knees dynamiques', 'Jumping jacks legers']),
    {type:'retour', name:'Retour au calme', detail:'Marche + etirements complets', duration:300},
  ]},
  'SM2': { name:'Séance maison #2 — Renfo complet & Cardio (intempéries)', duration:0, steps:[
    {type:'info', name:'Échauffement', detail:'', duration:4},
    ...circuitWarmup(2, 40, 60, CW_HOME5_V2),
    {type:'repos', name:'Transition — Renfo membre inférieur', detail:'Prepare-toi', duration:20},
    ...customBlock('Renfo — Membre inférieur', 3, LOWER_HOME_V2, 75),
    {type:'repos', name:'Transition — Renfo membre supérieur', detail:'Prepare-toi', duration:20},
    ...customBlock('Renfo — Membre supérieur', 3, UPPER_HOME_V2, 70),
    {type:'repos', name:'Transition — Gainage', detail:'Prepare-toi', duration:20},
    ...customBlock('Gainage', 3, CORE_HOME_V2, 65),
    {type:'repos', name:'Transition — Cardio', detail:'Dernier effort', duration:20},
    ...cardioInter(10, 25, 15, ['Fentes sautees legeres', 'Burpees sans pompe', 'Montees de genoux rapides', 'Talons-fesses rapides']),
    {type:'retour', name:'Retour au calme', detail:'Marche + etirements complets', duration:300},
  ]},
  'S1-A': { name:'S1-A · Footing de relance', duration:41*60, steps:[
    {type:'exo', name:'Marche rapide', detail:'', duration:120},
    {type:'exo', name:'Montees de genoux', detail:'', duration:60},
    {type:'exo', name:'Talons-fesses', detail:'', duration:60},
    {type:'exo', name:'Pas chasses', detail:'', duration:60},
    {type:'exo', name:'Squats lents', detail:'', duration:60},
    {type:'exo', name:'Equilibre jambe droite', detail:'Station debout sur un pied', duration:20},
    {type:'exo', name:'Equilibre jambe gauche', detail:'Station debout sur un pied', duration:20},
    {type:'exo', name:'Sauts jambe droite', detail:'10 petits sauts', duration:10},
    {type:'exo', name:'Sauts jambe gauche', detail:'10 petits sauts', duration:10},
    {type:'exo', name:'Planche', detail:'Corps aligne', duration:20},
    {type:'exo', name:'Bird dog', detail:'10 sec chaque cote', duration:20},
    {type:'exo', name:'Gainage lateral droit', detail:'', duration:15},
    {type:'exo', name:'Gainage lateral gauche', detail:'', duration:15},
    {type:'fond', name: gb ? 'Footing continu GB' : 'Footing continu', detail:'Allure conversationnelle — pouvoir parler sans s\'etouffer', duration: gb ? 1296 : 1610},
    ...(gb ? [
      {type:'info', name:'Echelle de rythme GB', detail:'6 variantes · 2 passages · S1 rythme lent · recup 20 sec entre variantes', duration:4},
      {type:'exo', name:'Variante 1 — Pas simple', detail:'1 pied par case, avancer · 2 passages', duration:40},
      {type:'exo', name:'Variante 2 — Pas double', detail:'2 pieds dans chaque case · 2 passages', duration:40},
      {type:'exo', name:'Variante 3 — Lateral 1 pied', detail:'Deplacement lateral, 1 pied par case · 2 passages', duration:40},
      {type:'exo', name:'Variante 4 — Lateral 2 pieds', detail:'Deplacement lateral, 2 pieds par case · 2 passages', duration:40},
      {type:'exo', name:'Variante 5 — Slalom exterieur', detail:'Pieds sortent alternativement a l\'exterieur · 2 passages', duration:40},
      {type:'exo', name:'Variante 6 — Libre', detail:'Invente ta variante ou reprends la plus difficile · 2 passages', duration:40},
      {type:'repos', name:'Transition', detail:'', duration:20},
      {type:'exo', name:'Dissociation bras/jambe — cote droit', detail:'Echange ballon au pied + echange balle main gauche vers main droite simultanement', duration:90},
      {type:'exo', name:'Dissociation bras/jambe — cote gauche', detail:'Meme chose cote gauche', duration:90},
    ] : []),
    {type:'retour', name:'Retour au calme', detail:'Marche 3 min + etirements complets', duration:420},
  ]},
  'S1-B': { name:'S1-B · Circuit + Explo + Gainage + Cardio', duration:2490, steps:[
    ...circuitWarmup(2, 45, 60, CW_S1),
    {type:'repos', name:'Transition — Explosivite', detail:'Reprends ton souffle', duration:30},
    ...explo(3, gb?Explo_S1_GB:Explo_S1, 90),
    {type:'repos', name:'Transition — Gainage', detail:'Prepare-toi pour le gainage', duration:30},
    ...gainage(4, gb?GDyn_S1_GB:GDyn_S1, 45),
    {type:'repos', name:'Transition — Cardio', detail:'Dernier bloc, courage', duration:30},
    ...cardioInter(6, 30, 30, ['Montees de genoux rapides', 'Navette courte 5m']),
    {type:'retour', name:'Retour au calme', detail:'Marche + etirements', duration:240},
  ]},
  'S1-C': { name:'S1-C · Cardio + Renfo & Gainage alternes', duration:2066, steps:[
    {type:'info', name:'Échauffement', detail:'', duration:4},
    {type:'exo', name:'Corde a sauter', detail:'Echauffement — 3 min rythme libre', duration:180},
    {type:'exo', name:'Pas chasses', detail:'', duration:60},
    {type:'exo', name:'Montees de genoux', detail:'', duration:60},
    {type:'exo', name:'Squats lents', detail:'x6', duration:60},
    {type:'exo', name:'Pompes', detail:'x4', duration:60},
    ...renfoGainage(3, gb?RG_S1_GB:RG_S1, 90),
    {type:'repos', name:'Transition — Cardio', detail:'', duration:20},
    ...cardioInter(6, 30, 30, ['Montees de genoux rapides', 'Navette courte 5m']),
    ...(gb ? [
      {type:'info', name:'Echelle de rythme GB', detail:'6 variantes · 2 passages · S1 rythme lent · recup 20 sec entre variantes', duration:4},
      {type:'exo', name:'Variante 1 — Pas simple', detail:'1 pied par case, avancer · 2 passages', duration:40},
      {type:'exo', name:'Variante 2 — Pas double', detail:'2 pieds dans chaque case · 2 passages', duration:40},
      {type:'exo', name:'Variante 3 — Lateral 1 pied', detail:'Deplacement lateral, 1 pied par case · 2 passages', duration:40},
      {type:'exo', name:'Variante 4 — Lateral 2 pieds', detail:'Deplacement lateral, 2 pieds par case · 2 passages', duration:40},
      {type:'exo', name:'Variante 5 — Slalom exterieur', detail:'Pieds sortent alternativement a l\'exterieur · 2 passages', duration:40},
      {type:'exo', name:'Variante 6 — Libre', detail:'Invente ta variante ou reprends la plus difficile · 2 passages', duration:40},
      {type:'repos', name:'Transition', detail:'', duration:20},
      {type:'info', name:'Ouverture de hanche GB — S1', detail:'Mobilite specifique gardien', duration:4},
      {type:'exo', name:'Echange mur — pied droit', detail:'Envoyer le ballon contre le mur avec le plat du pied et controler le retour · 30 sec', duration:30},
      {type:'exo', name:'Echange mur — pied gauche', detail:'30 sec', duration:30},
      {type:'exo', name:'Mobilite hanche assise', detail:'Essuie-glace des genoux — chaque cote touche le sol, l\'un par sa face externe, l\'autre par sa face interne · 10 bascules chaque cote', duration:90},
      {type:'repos', name:'Transition — Roulade + parade', detail:'Sur tapis ou herbe', duration:20},
      {type:'info', name:'Roulade + remise debout + parade basse — S1', detail:'Sans chute · geste lent — focus ouverture hanche et placement du pied', duration:5},
      {type:'exo', name:'Roulade → debout stabilise → parade — cote droit', detail:'Roulade avant → se relever bien stabilise → parade basse ouverture hanche', duration:90},
      {type:'exo', name:'Roulade → debout stabilise → parade — cote gauche', detail:'', duration:90},
    ] : []),
    {type:'retour', name:'Retour au calme', detail:'Marche + etirements complets', duration:240},
  ]},
  'S2-A': { name:'S2-A · Footing + accelerations', duration:47*60, steps:[
    {type:'exo', name:'Echauffement', detail:'Marche rapide + trot progressif', duration:300},
    {type:'info', name:'Activation Gainage', detail:'', duration:4},
    {type:'exo', name:'Equilibre jambe droite', detail:'Station debout sur un pied', duration:20},
    {type:'exo', name:'Equilibre jambe gauche', detail:'Station debout sur un pied', duration:20},
    {type:'exo', name:'Sauts jambe droite', detail:'10 petits sauts', duration:10},
    {type:'exo', name:'Sauts jambe gauche', detail:'10 petits sauts', duration:10},
    {type:'exo', name:'Planche', detail:'Corps aligne', duration:25},
    {type:'exo', name:'Bird dog', detail:'12 sec chaque cote', duration:25},
    {type:'exo', name:'Gainage lateral droit', detail:'', duration:20},
    {type:'exo', name:'Gainage lateral gauche', detail:'', duration:20},
    {type:'fond', name:'Footing continu', detail: gb ? '13 min 36s allure reguliere' : '18,5 min allure reguliere', duration: gb ? 816 : 1110},
    {type:'info', name:'Fin du footing', detail:'', duration:4},
    ...cardioInter(6, 20, 20, ['Accelerations'], 'Trottine', true, true, 'intro-accelerations-trottine'),
    {type:'fond', name:'Footing leger', detail:'8 min pour terminer', duration:480},
    ...(gb ? [
      {type:'info', name:'Echelle de rythme GB', detail:'6 variantes · 2 passages · S2 rythme moyen · recup 20 sec entre variantes', duration:4},
      {type:'exo', name:'Variante 1 — Pas simple', detail:'1 pied par case, avancer · 2 passages', duration:40},
      {type:'exo', name:'Variante 2 — Pas double', detail:'2 pieds dans chaque case · 2 passages', duration:40},
      {type:'exo', name:'Variante 3 — Lateral 1 pied', detail:'Deplacement lateral, 1 pied par case · 2 passages', duration:40},
      {type:'exo', name:'Variante 4 — Lateral 2 pieds', detail:'Deplacement lateral, 2 pieds par case · 2 passages', duration:40},
      {type:'exo', name:'Variante 5 — Slalom exterieur', detail:'Pieds sortent alternativement a l\'exterieur · 2 passages', duration:40},
      {type:'exo', name:'Variante 6 — Libre', detail:'Invente ta variante ou reprends la plus difficile · 2 passages', duration:40},
      {type:'repos', name:'Transition', detail:'', duration:20},
      {type:'exo', name:'Dissociation bras/jambe — cote droit', detail:'Echange ballon au pied + echange balle main gauche vers main droite simultanement', duration:90},
      {type:'exo', name:'Dissociation bras/jambe — cote gauche', detail:'Meme chose cote gauche', duration:90},
    ] : []),
    {type:'retour', name:'Retour au calme', detail:'Marche + etirements', duration:420},
  ]},
  'S2-B': { name:'S2-B · Circuit + Explo + Gainage', duration:45*60, steps:[
    ...circuitWarmup(2, 60, 60, CW_S2),
    {type:'repos', name:'Transition — Explosivite', detail:'', duration:30},
    ...explo(4, gb?Explo_S2_GB:Explo_S2, 80),
    {type:'repos', name:'Transition — Gainage', detail:'', duration:30},
    ...gainage(4, gb?GDyn_S2_GB:GDyn_S2, 40),
    {type:'retour', name:'Retour au calme', detail:'Marche + etirements', duration:240},
  ]},
  'S2-C': { name:'S2-C · Cardio + Renfo & Gainage alternes ↑', duration:2653, steps:[
    {type:'info', name:'Échauffement', detail:'', duration:4},
    {type:'exo', name:'Corde a sauter', detail:'Echauffement — 4 min progressif', duration:240},
    {type:'exo', name:'Squats', detail:'x8', duration:60},
    {type:'exo', name:'Pompes', detail:'x6', duration:60},
    {type:'exo', name:'Equilibre jambe droite', detail:'Station debout sur un pied', duration:20},
    {type:'exo', name:'Equilibre jambe gauche', detail:'Station debout sur un pied', duration:20},
    {type:'exo', name:'Sauts jambe droite', detail:'10 petits sauts', duration:10},
    {type:'exo', name:'Sauts jambe gauche', detail:'10 petits sauts', duration:10},
    ...renfoGainage(4, gb?RG_S2_GB:RG_S2, 80),
    {type:'repos', name:'Transition — Cardio', detail:'', duration:20},
    ...cardioInterSplit(7, 30, 20, 120, ['Pas chasses lateraux', 'Talons-fesses rapides']),
    ...(gb ? [
      {type:'info', name:'Ouverture de hanche GB — S2', detail:'Mobilite specifique gardien', duration:4},
      {type:'exo', name:'Echange mur — pied droit', detail:'40 sec', duration:40},
      {type:'exo', name:'Echange mur — pied gauche', detail:'40 sec', duration:40},
      {type:'exo', name:'Echange mur — pied droit', detail:'Serie 2', duration:40},
      {type:'exo', name:'Echange mur — pied gauche', detail:'Serie 2', duration:40},
      {type:'exo', name:'Mobilite hanche assise', detail:'Essuie-glace des genoux — 10 bascules chaque cote', duration:90},
      {type:'exo', name:'Travail GB hanche sans ballon', detail:'Position basse gardien — deplacements lateraux + ouverture hanche interieure 2 sec a chaque arret · 1 min', duration:60},
      {type:'exo', name:'Fente laterale — cote droit', detail:'Aller plus bas qu\'en S1 · 35 sec', duration:35},
      {type:'exo', name:'Fente laterale — cote gauche', detail:'', duration:35},
      {type:'exo', name:'Psoas-iliaque — jambe droite', detail:'Fente avant tenue · 30 sec', duration:30},
      {type:'exo', name:'Psoas-iliaque — jambe gauche', detail:'', duration:30},
      {type:'exo', name:'Rotation de hanche debout — jambe droite', detail:'12 rotations chaque sens', duration:35},
      {type:'exo', name:'Rotation de hanche debout — jambe gauche', detail:'', duration:35},
      {type:'repos', name:'Transition — Roulade + parade', detail:'Sur tapis ou herbe', duration:20},
      {type:'info', name:'Roulade + remise debout + parade basse x6 — S2', detail:'Sans chute · vitesse augmentee vs S1', duration:5},
      {type:'exo', name:'Roulade → debout stabilise → parade — cote droit', detail:'Plus rapide — placement du pied reste prioritaire', duration:22},
      {type:'exo', name:'Roulade → debout stabilise → parade — cote gauche', detail:'', duration:22},
      {type:'exo', name:'Roulade → debout stabilise → parade — cote droit', detail:'', duration:22},
      {type:'exo', name:'Roulade → debout stabilise → parade — cote gauche', detail:'', duration:22},
      {type:'exo', name:'Roulade → debout stabilise → parade — cote droit', detail:'', duration:22},
      {type:'exo', name:'Roulade → debout stabilise → parade — cote gauche', detail:'', duration:22},
    ] : []),
    {type:'retour', name:'Retour au calme', detail:'Marche + etirements', duration:240},
  ]},
  'S3-A': { name:'S3-A · Footing long + fractionne', duration:57*60, steps:[
    {type:'exo', name:'Echauffement', detail:'Marche rapide + trot progressif', duration:300},
    {type:'exo', name:'Equilibre jambe droite', detail:'Station debout sur un pied', duration:20},
    {type:'exo', name:'Equilibre jambe gauche', detail:'Station debout sur un pied', duration:20},
    {type:'exo', name:'Sauts jambe droite', detail:'10 petits sauts', duration:10},
    {type:'exo', name:'Sauts jambe gauche', detail:'10 petits sauts', duration:10},
    {type:'exo', name:'Planche', detail:'Corps aligne', duration:30},
    {type:'exo', name:'Bird dog', detail:'15 sec chaque cote', duration:30},
    {type:'exo', name:'Gainage lateral droit', detail:'', duration:25},
    {type:'exo', name:'Gainage lateral gauche', detail:'', duration:25},
    {type:'exo', name:'Russian twist leger', detail:'Rotation lente et controlee', duration:20},
    {type:'fond', name:'Footing continu', detail: gb ? '17 min 46s allure reguliere' : '22 min allure reguliere', duration: gb ? 1066 : 1320},
    {type:'info', name:'Fin du footing', detail:'', duration:4},
    ...cardioInter(8, 30, 30, ['Fractionne'], 'Trottine'),
    {type:'fond', name:'Footing leger', detail:'8 min pour terminer', duration:480},
    ...(gb ? [
      {type:'info', name:'Echelle de rythme GB', detail:'6 variantes · 2 passages · S3 rythme rapide · recup 20 sec entre variantes', duration:4},
      {type:'exo', name:'Variante 1 — Pas simple', detail:'1 pied par case, avancer · 2 passages', duration:40},
      {type:'exo', name:'Variante 2 — Pas double', detail:'2 pieds dans chaque case · 2 passages', duration:40},
      {type:'exo', name:'Variante 3 — Lateral 1 pied', detail:'Deplacement lateral, 1 pied par case · 2 passages', duration:40},
      {type:'exo', name:'Variante 4 — Lateral 2 pieds', detail:'Deplacement lateral, 2 pieds par case · 2 passages', duration:40},
      {type:'exo', name:'Variante 5 — Slalom exterieur', detail:'Pieds sortent alternativement a l\'exterieur · 2 passages', duration:40},
      {type:'exo', name:'Variante 6 — Libre', detail:'Invente ta variante ou reprends la plus difficile · 2 passages', duration:40},
      {type:'repos', name:'Transition', detail:'', duration:20},
      {type:'exo', name:'Dissociation bras/jambe — cote droit', detail:'Echange ballon au pied + echange balle main gauche vers main droite simultanement', duration:90},
      {type:'exo', name:'Dissociation bras/jambe — cote gauche', detail:'Meme chose cote gauche', duration:90},
    ] : []),
    {type:'retour', name:'Retour au calme', detail:'Marche + etirements complets', duration:420},
  ]},
  'S3-B': { name:'S3-B · Circuit + Explo max + Gainage', duration:50*60, steps:[
    ...circuitWarmup(2, 60, 60, CW_S3),
    {type:'repos', name:'Transition — Explosivite', detail:'', duration:30},
    ...explo(4, gb?Explo_S3_GB:Explo_S3, 80),
    {type:'repos', name:'Transition — Gainage', detail:'', duration:30},
    ...gainage(5, gb?GDyn_S3_GB:GDyn_S3, 35),
    {type:'retour', name:'Retour au calme', detail:'Marche + etirements', duration:300},
  ]},
  'S3-C': { name:'S3-C · Cardio + Circuit intensif + Finisher', duration:2693, steps:[
    {type:'info', name:'Échauffement', detail:'', duration:4},
    {type:'exo', name:'Corde a sauter', detail:'Echauffement — 4 min progressif', duration:240},
    {type:'exo', name:'Squats', detail:'x8', duration:60},
    {type:'exo', name:'Pompes', detail:'x6', duration:60},
    {type:'exo', name:'Equilibre jambe droite', detail:'Station debout sur un pied', duration:20},
    {type:'exo', name:'Equilibre jambe gauche', detail:'Station debout sur un pied', duration:20},
    {type:'exo', name:'Sauts jambe droite', detail:'10 petits sauts', duration:10},
    {type:'exo', name:'Sauts jambe gauche', detail:'10 petits sauts', duration:10},
    {type:'repos', name:'Transition — Circuit intensif', detail:'Le pic de la semaine !', duration:30},
    ...circuitIntense(4, gb?CI_S3_GB:CI_S3, 80),
    {type:'repos', name:'Transition — Cardio', detail:'Dernier effort', duration:30},
    ...cardioInterSplit(9, 25, 15, 150, ['Montees de genoux rapides', 'Navette courte 5m', 'Pas chasses lateraux']),
    ...(gb ? [
      {type:'info', name:'Echelle de rythme GB', detail:'6 variantes · 2 passages · S3 rythme rapide · recup 20 sec entre variantes', duration:4},
      {type:'exo', name:'Variante 1 — Pas simple', detail:'1 pied par case, avancer · 2 passages', duration:40},
      {type:'exo', name:'Variante 2 — Pas double', detail:'2 pieds dans chaque case · 2 passages', duration:40},
      {type:'exo', name:'Variante 3 — Lateral 1 pied', detail:'Deplacement lateral, 1 pied par case · 2 passages', duration:40},
      {type:'exo', name:'Variante 4 — Lateral 2 pieds', detail:'Deplacement lateral, 2 pieds par case · 2 passages', duration:40},
      {type:'exo', name:'Variante 5 — Slalom exterieur', detail:'Pieds sortent alternativement a l\'exterieur · 2 passages', duration:40},
      {type:'exo', name:'Variante 6 — Libre', detail:'Invente ta variante ou reprends la plus difficile · 2 passages', duration:40},
      {type:'repos', name:'Transition', detail:'', duration:20},
      {type:'info', name:'Ouverture de hanche GB — S3', detail:'Mobilite specifique gardien', duration:4},
      {type:'exo', name:'Echange mur — pied droit', detail:'45 sec', duration:45},
      {type:'exo', name:'Echange mur — pied gauche', detail:'45 sec', duration:45},
      {type:'exo', name:'Echange mur — pied droit', detail:'Serie 2', duration:45},
      {type:'exo', name:'Echange mur — pied gauche', detail:'Serie 2', duration:45},
      {type:'exo', name:'Travail GB hanche avec ballon', detail:'Position basse gardien + deplacements + ballon · 1 min 30', duration:90},
      {type:'exo', name:'Mobilite hanche assise', detail:'Essuie-glace des genoux — 10 bascules chaque cote', duration:90},
      {type:'exo', name:'Fente laterale — cote droit', detail:'Amplitude maximale · 40 sec', duration:40},
      {type:'exo', name:'Fente laterale — cote gauche', detail:'', duration:40},
      {type:'exo', name:'Psoas-iliaque — jambe droite', detail:'35 sec', duration:35},
      {type:'exo', name:'Psoas-iliaque — jambe gauche', detail:'', duration:35},
      {type:'exo', name:'Rotation de hanche debout — jambe droite', detail:'15 rotations chaque sens', duration:35},
      {type:'exo', name:'Rotation de hanche debout — jambe gauche', detail:'', duration:35},
      {type:'repos', name:'Transition — Roulade + parade + chute', detail:'Sur tapis ou herbe obligatoire', duration:20},
      {type:'info', name:'Roulade + remise debout + parade + chute x6 — S3', detail:'Avec chute ! · roulade → debout → parade → chute laterale → relevement immediat', duration:5},
      {type:'exo', name:'Roulade → debout → parade → chute — cote droit', detail:'Avant-bras touche en premier, puis cuisse. Se relever immediatement.', duration:28},
      {type:'exo', name:'Roulade → debout → parade → chute — cote gauche', detail:'', duration:28},
      {type:'exo', name:'Roulade → debout → parade → chute — cote droit', detail:'', duration:28},
      {type:'exo', name:'Roulade → debout → parade → chute — cote gauche', detail:'', duration:28},
      {type:'exo', name:'Roulade → debout → parade → chute — cote droit', detail:'', duration:28},
      {type:'exo', name:'Roulade → debout → parade → chute — cote gauche', detail:'', duration:28},
    ] : []),
    {type:'retour', name:'Retour au calme', detail:'Marche + etirements complets', duration:240},
  ]},
  'S4-A': { name:'S4-A · Footing de recuperation', duration:2580, steps:[
    {type:'exo', name:'Echauffement leger', detail:'5 min marche + trot tres lent', duration:300},
    {type:'exo', name:'Planche', detail:'Corps aligne — maintien', duration:20},
    {type:'exo', name:'Bird dog', detail:'10 sec chaque cote — maintien', duration:20},
    {type:'exo', name:'Gainage lateral droit', detail:'maintien', duration:15},
    {type:'exo', name:'Gainage lateral gauche', detail:'maintien', duration:15},
    {type:'fond', name:'Footing de recuperation', detail: gb ? '22 min 36s allure confort absolu — pas de performance' : '29 min allure confort absolu — pas de performance', duration: gb ? 1356 : 1730},
    ...(gb ? [
      {type:'info', name:'Echelle de rythme GB', detail:'6 variantes · 2 passages · S4 rythme rapide + bras actifs · recup 20 sec entre variantes', duration:4},
      {type:'exo', name:'Variante 1 — bras actifs', detail:'1 pied par case · imiter les bras en parade · 2 passages', duration:40},
      {type:'exo', name:'Variante 2 — bras actifs', detail:'2 pieds dans chaque case · bras actifs · 2 passages', duration:40},
      {type:'exo', name:'Variante 3 — bras actifs', detail:'Lateral 1 pied · bras actifs · 2 passages', duration:40},
      {type:'exo', name:'Variante 4 — bras actifs', detail:'Lateral 2 pieds · bras actifs · 2 passages', duration:40},
      {type:'exo', name:'Variante 5 — bras actifs', detail:'Slalom exterieur · bras actifs · 2 passages', duration:40},
      {type:'exo', name:'Variante 6 — bras actifs', detail:'Libre · bras actifs · 2 passages', duration:40},
      {type:'repos', name:'Transition', detail:'', duration:20},
      {type:'exo', name:'Dissociation bras/jambe — cote droit', detail:'Echange ballon au pied + echange balle main gauche vers main droite simultanement', duration:90},
      {type:'exo', name:'Dissociation bras/jambe — cote gauche', detail:'Meme chose cote gauche', duration:90},
    ] : []),
    {type:'retour', name:'Etirements complets', detail:'10 min — derniere seance avant le 17 aout !', duration:600},
  ]},
  'S4-B': { name:'S4-B · Circuit + Explo + Gainage + Cardio (maintien)', duration:42*60, steps:[
    ...circuitWarmup(2, 60, 60, CW_S1),
    {type:'repos', name:'Transition — Explosivite', detail:'', duration:30},
    ...explo(3, gb?Explo_S4_GB:Explo_S4, 90),
    {type:'repos', name:'Transition — Gainage', detail:'', duration:30},
    ...gainage(3, gb?GDyn_S4_GB:GDyn_S4, 45),
    {type:'repos', name:'Transition — Cardio', detail:'Dernier bloc, courage', duration:30},
    ...cardioInter(9, 20, 20, ['Jumping jacks legers', 'Corde a sauter legere']),
    {type:'retour', name:'Retour au calme', detail:'Marche + etirements', duration:240},
  ]},
  'S4-C': { name:'S4-C · Cardio + Renfo & Gainage (maintien)', duration:2020, steps:[
    {type:'info', name:'Échauffement', detail:'', duration:4},
    {type:'exo', name:'Corde a sauter', detail:'Echauffement — 3 min', duration:180},
    {type:'exo', name:'Squats', detail:'x6', duration:50},
    {type:'exo', name:'Pompes', detail:'x5', duration:50},
    {type:'exo', name:'Equilibre jambe droite', detail:'Station debout sur un pied', duration:20},
    {type:'exo', name:'Equilibre jambe gauche', detail:'Station debout sur un pied', duration:20},
    {type:'exo', name:'Sauts jambe droite', detail:'10 petits sauts', duration:10},
    {type:'exo', name:'Sauts jambe gauche', detail:'10 petits sauts', duration:10},
    ...renfoGainage(3, gb?RG_S4_GB:RG_S4, 90),
    {type:'repos', name:'Transition — Cardio', detail:'', duration:20},
    ...cardioInter(12, 15, 15, ['Skater jumps legers', 'Squat jumps legers', 'High knees dynamiques']),
    ...(gb ? [
      {type:'info', name:'Echelle de rythme GB', detail:'6 variantes · 2 passages · S4 rythme rapide + bras actifs · recup 20 sec entre variantes', duration:4},
      {type:'exo', name:'Variante 1 — bras actifs', detail:'1 pied par case · imiter les bras en parade · 2 passages', duration:40},
      {type:'exo', name:'Variante 2 — bras actifs', detail:'2 pieds dans chaque case · bras actifs · 2 passages', duration:40},
      {type:'exo', name:'Variante 3 — bras actifs', detail:'Lateral 1 pied · bras actifs · 2 passages', duration:40},
      {type:'exo', name:'Variante 4 — bras actifs', detail:'Lateral 2 pieds · bras actifs · 2 passages', duration:40},
      {type:'exo', name:'Variante 5 — bras actifs', detail:'Slalom exterieur · bras actifs · 2 passages', duration:40},
      {type:'exo', name:'Variante 6 — bras actifs', detail:'Libre · bras actifs · 2 passages', duration:40},
      {type:'repos', name:'Transition', detail:'', duration:20},
      {type:'info', name:'Ouverture de hanche GB — S4 bilan', detail:'Mobilite specifique gardien', duration:4},
      {type:'exo', name:'Echange mur — pied droit', detail:'38 sec', duration:38},
      {type:'exo', name:'Echange mur — pied gauche', detail:'38 sec', duration:38},
      {type:'exo', name:'Mobilite hanche assise', detail:'Essuie-glace des genoux — 10 bascules chaque cote', duration:70},
      {type:'info', name:'Roulade + remise debout + parade + chute x6 — S4 BILAN', detail:'Fluidite et enchainement — geste complet gardien', duration:5},
      {type:'exo', name:'Roulade → debout → parade → chute — cote droit', detail:'Relevement le plus rapide possible — chronometre-toi', duration:28},
      {type:'exo', name:'Roulade → debout → parade → chute — cote gauche', detail:'', duration:28},
      {type:'exo', name:'Roulade → debout → parade → chute — cote droit', detail:'', duration:28},
      {type:'exo', name:'Roulade → debout → parade → chute — cote gauche', detail:'', duration:28},
      {type:'exo', name:'Roulade → debout → parade → chute — cote droit', detail:'', duration:28},
      {type:'exo', name:'Roulade → debout → parade → chute — cote gauche', detail:'Derniere repetition — tu es pret pour le 17 aout !', duration:28},
    ] : []),
    {type:'retour', name:'Retour au calme', detail:'Marche + etirements — derniere seance avant le 17 aout !', duration:240},
  ]},
  };
  // La duree totale de chaque seance est calculee automatiquement a partir des etapes reelles,
  // pour rester toujours juste (joueur et GB peuvent avoir un contenu different, donc une duree differente).
  Object.values(sessions).forEach(s => {
    s.duration = s.steps.reduce((sum, step) => sum + step.duration, 0);
  });
  return sessions;
}

