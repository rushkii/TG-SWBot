(async () => {
  const { createCanvas, loadImage, registerFont } = require('canvas');
  const fs = require('fs');
  const got = require('got');
  const { program } = require('commander');


  let programDesc = "CLI version for generated HSR card characters build. "
  programDesc += "This program is used by Telegram bot @silverwolffbot\n"
  programDesc += "Author: https://github.com/rushkii"

  program
    .name("hsr-card-by-silverwolffbot")
    .description(programDesc)
    .version("1.0.0");

  program
    .option("-u, --uid <HSR_INGAME_UID>", "Define your Honkai: Star Rail in-game UID")
    .option("-c, --character <CHARACTER_INDEX_[0~3]>", "Define character index from 0 to 3", 0)
    .option("-p, --rounded_photo <CUSTOM_ROUNDED_PHOTO>", "Rounded photo filename that located on assets/common/*.[jpg|png]", null)
    .option("-f, --as_file <true|false>", "Determine what output will be, `false` for write base64 to stdout", true);

  program.parse(process.argv);
  const options = program.opts();

  if(!options.hasOwnProperty("uid")) {
    console.log("\x1b[1m\x1b[31m%s\x1b[0m", "Missing required arguments.");
    console.log(
      "Example usage: \x1b[1m%s\x1b[0m",
      "node generate.js --uid 801341249"
    );
    console.log(
      "or use \x1b[1m%s\x1b[0m to see details.",
      "node generate.js --help"
    );
    process.exit(1);
  }


  registerFont("./assets/fonts/Rubik-Light.ttf", {family: "Rubik Light"});
  registerFont("./assets/fonts/Rubik-LightItalic.ttf", {family: "Rubik LightItalic"});
  registerFont("./assets/fonts/Rubik-Medium.ttf", {family: "Rubik Medium"});
  registerFont("./assets/fonts/Rubik-SemiBold.ttf", {family: "Rubik SemiBold"});
  registerFont("./assets/fonts/Rubik-SemiBoldItalic.ttf", {family: "Rubik SemiBoldItalic"});

  const rarityFrame = {
    3: [
      {offset: 0, color: "#515474"},
      {offset: 0.1, color: "#506688"},
      {offset: 0.3, color: "#4d799a"},
      {offset: 0.7, color: "#498ca9"},
      {offset: 1, color: "#499fb3"}
    ],
    4: [
      {offset: 0, color: "#595482"},
      {offset: 0.1, color: "#6e6195"},
      {offset: 0.3, color: "#866da7"},
      {offset: 0.7, color: "#9e7ab9"},
      {offset: 1, color: "#b886ca"}
    ],
    5: [
      {offset: 0, color: "#695453"},
      {offset: 0.1, color: "#90655b"},
      {offset: 0.3, color: "#b3785d"},
      {offset: 0.7, color: "#d1905a"},
      {offset: 1, color: "#e6ac54"}
    ]
  }

  const elementColor = {
    "Fire": ["#e62e00", "#d47861"],
    "Ice": ["#00ade6", "#61a4d4"],
    "Imaginary": ["#e6db00", "#d4d461"],
    "Lightning": ["#d700e6", "#d473d9"],
    "Physical": ["#c2c2c2", "#d6d6d6"],
    "Quantum": ["#5200d6", "#8d61d4"],
    "Wind": ["#00e660", "#61d497"],
  }

  const { body } = await got.get(
    `https://api.mihomo.me/sr_info_parsed/${options.uid}?lang=en`, {
      retry: {
        errorCodes: ["ETIMEDOUT", "EAI_AGAIN"]
      }
    }
  )
  const data = JSON.parse(body);

  if(data.characters.length === 0) {
    console.log("Looks like no character displayed on this UID. Please display your character in the in-game.");
    process.exit(1);
  } else if(options.character > data.characters.length - 1) {
    console.log(
      `This UID only has ${data.characters.length} characters and you want to get index ${options.character} which mean out of range.\nUsing \x1b[1m%s\x1b[0m command might work.`,
      `node generate.js --uid <YOUR_INGAME_UID> --character ${options.character - 1}`
    );
    process.exit(1);
  }

  const character = data.characters[options.character];

  let attrs = [];
  for(let i = 0; i < character.attributes.length; i++) {
    const attribute = character.attributes[i]
    const attr = {
      "name": attribute.name.replace(" Boost", ""),
      "icon": attribute.icon.split("/").at(-1),
      "attribute": attribute.value,
      "attrDisplay": attribute.display,
      "percent": attribute.percent
    }
    attrs.push(attr);
  }
  for(let i = 0; i < character.additions.length; i++) {
    const addition = character.additions[i]
    const attr = {
      "name": addition.name.replace(" Boost", ""),
      "icon": addition.icon.split("/").at(-1),
      "addition": addition.value,
      "addedDispaly": addition.display,
      "percent": addition.percent
    }
    attrs.push(attr);
  }

  let attrFix = [];
  for(let i = 0; i < attrs.length; i++) {
    const found = attrFix.find(e => {
      return e.name === attrs[i].name
    })
    if(!found) {
      attrFix.push(attrs[i])
    }
  }

  attrs.reduce((acc, obj) => {
    const existingObj = acc.find(item => item.name === obj.name);
    if (existingObj) {
      Object.assign(existingObj, obj);
    } else {
      acc.push(obj);
    }
    return acc;
  }, []);

  let maxLengthAttr = 0;
  for(let i = 0; i < attrFix.length; i++) {
    const nameLength = attrFix[i].name.length
    if(nameLength >= maxLengthAttr) {
      maxLengthAttr = nameLength
    }
  }

  const paddingBottomAttr = 70;
  const canvasW = 2720 + (maxLengthAttr * 10)
  const canvasH = 80 * attrFix.length + 620 + paddingBottomAttr
  const canvas = createCanvas(canvasW, canvasH, "png")
  const ctx = canvas.getContext('2d')

  let profileName = data.player.nickname
  profileName = profileName.length <= 20 ? profileName : profileName.substring(0, 20) + "..."

  let ppFile;
  if(!["", null, undefined, 0].includes(options.rounded_photo)) {
    ppFile = `./assets/common/${options.rounded_photo}`;
  } else {
    const ppIcon = data.player.avatar.icon.split("/").at(-1)
    ppFile = `./assets/avatars/rounded/${ppIcon}`
  }

  const [
    pp, bg, charIcon, friendIcon,
    achieveIcon, drawCardImg, weapon,
    star, pathIcon, elemIcon
  ] = await Promise.all([
    loadImage(ppFile),
    loadImage("./assets/common/background.png"),
    loadImage("./assets/icons/AvatarIcon.png"),
    loadImage("./assets/icons/FriendIcon.png"),
    loadImage("./assets/icons/AchievementIcon.png"),
    loadImage(`./assets/avatars/drawcard/${character.id}.png`),
    loadImage(`./assets/lightcones/${character.light_cone.id}.png`),
    loadImage("./assets/icons/UI_Star_01.png"),
    loadImage(`./assets/icons/paths/BgPaths${character.path.id}.png`),
    loadImage(`./assets/icons/elements/IconAttribute${character.element.id}.png`),
  ]);

  ctx.save()
  ctx.beginPath()
  ctx.drawImage(bg, 0, 0, bg.width, bg.height)
  ctx.drawImage(drawCardImg, 300, -400, 2000, 2000)
  ctx.font = `30px "Rubik SemiBold"`
  ctx.fillStyle = "#fff"
  ctx.textAlign = "center"
  ctx.globalAlpha = 1
  ctx.fillText(data.player.uid, 110, 220)
  ctx.restore()

  ctx.drawImage(weapon, 20, 270, 150, 150)

  if(Object.keys(character.light_cone).length !== 0) {
    let starMargin = 0;
    for(let i = 0; i < character.light_cone.rarity; i++) {
      const rarityXAxis = {
        5: 25,
        4: 35,
        3: 45
      } || 15;
      ctx.drawImage(star, rarityXAxis[character.light_cone.rarity] + starMargin, 400, 35, 35)
      starMargin += 25
    }

    const lightConeName = character.light_cone.name;
    const nameArr = lightConeName.split(" ");

    ctx.fillStyle = "rgba(0, 0, 0, .8)"
    ctx.font = `40px "Rubik SemiBold"`
    ctx.fillStyle = "#fff"
    ctx.textAlign = "start"

    let breakHeight = 0;
    for (let i = 0; i < nameArr.length; i += 3) {
      const chunk = nameArr.slice(i, i + 3).join(" ");
      ctx.fillText(chunk, 190, 310 + breakHeight)
      breakHeight += 50
    }

    ctx.globalAlpha = .8
    ctx.font = `30px "Rubik Light"`
    ctx.fillText("Lv. ", 190, 320 + breakHeight)
    ctx.globalAlpha = 1
    ctx.font = `30px "Rubik SemiBold"`
    ctx.fillText(character.light_cone.level, 230, 320 + breakHeight)
    ctx.restore()
  }

  // Gradient Opacity Image - Might be WIP
  // let gradient = ctx.createLinearGradient(250, 150, 2000, 150);
  // gradient.addColorStop(0, 'rgba(255,255,255,0)');
  // gradient.addColorStop(0.5, 'rgba(255,255,255,1)');
  // gradient.addColorStop(1, 'rgba(255,255,255,0)');
  // ctx.fillStyle = gradient;
  // ctx.fillRect(0, 0, 2000, 1500);

  // ctx.save()
  // ctx.beginPath()
  // let gradient = ctx.createLinearGradient(200, 70, 215, 320);
  // gradient.addColorStop(0, "#695453")
  // gradient.addColorStop(0.1, "#90655b")
  // gradient.addColorStop(0.2, "#b3785d")
  // gradient.addColorStop(0.5, "#d1905a")
  // gradient.addColorStop(1, "#e6ac54")
  // ctx.fillStyle = gradient;
  // ctx.roundRect(canvasW - 800, 20, 200, 200, 20)
  // ctx.fill()
  // ctx.restore()

  // ctx.save()
  // ctx.beginPath()
  // gradient = ctx.createLinearGradient(200, 70+220, 215, 320+220);
  // gradient.addColorStop(0, "#695453")
  // gradient.addColorStop(0.1, "#90655b")
  // gradient.addColorStop(0.2, "#b3785d")
  // gradient.addColorStop(0.5, "#d1905a")
  // gradient.addColorStop(1, "#e6ac54")
  // ctx.fillStyle = gradient;
  // ctx.roundRect(canvasW - 800, 240, 200, 200, 20)
  // ctx.fill()
  // ctx.restore()

  ctx.save()
  ctx.beginPath()
  ctx.arc(105, 100, 70, 0, Math.PI * 2, false)
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.clip()
  ctx.drawImage(pp, 35, 30, 140, 140)
  ctx.restore()

  ctx.save()
  ctx.beginPath()
  ctx.fillStyle = 'rgba(0, 0, 0, .5)'
  ctx.lineWidth = 1
  ctx.roundRect(185, 30, 330, 40, 15)
  ctx.fill()
  ctx.stroke()
  ctx.clip()
  ctx.font = `30px "Rubik SemiBold"`
  ctx.fillStyle = "#fff"
  ctx.textAlign = "start"
  ctx.fillText(profileName, 195, 60)
  ctx.restore()

  ctx.save()
  ctx.beginPath()
  ctx.font = `25px "Rubik Light"`
  ctx.fillStyle = "#fff"
  ctx.textAlign = "start"
  ctx.globalAlpha = .8
  ctx.fillText("Level", 195, 100)
  ctx.globalAlpha = 1
  ctx.font = `25px "Rubik SemiBold"`
  ctx.fillText(data.player.level, 260, 100)

  ctx.save()
  ctx.beginPath()
  ctx.font = `25px "Rubik Light"`
  ctx.fillStyle = "#fff"
  ctx.textAlign = "start"
  ctx.globalAlpha = .8
  ctx.fillText("Equilibrium", 355, 100)
  ctx.globalAlpha = 1
  ctx.font = `25px "Rubik SemiBold"`
  ctx.fillText(data.player.world_level, 490, 100)

  ctx.save()
  ctx.beginPath()
  ctx.globalAlpha = 0.7
  ctx.drawImage(friendIcon, 195, 130, 30, 30)
  ctx.font = `25px "Rubik SemiBold"`
  ctx.fillStyle = "#fff"
  ctx.textAlign = "start"
  ctx.globalAlpha = 1
  ctx.fillText(data.player.friend_count, 233, 154)
  ctx.restore()

  ctx.save()
  ctx.beginPath()
  ctx.globalAlpha = 0.7
  ctx.drawImage(charIcon, 305, 130, 30, 30)
  ctx.font = `25px "Rubik SemiBold"`
  ctx.fillStyle = "#fff"
  ctx.textAlign = "start"
  ctx.globalAlpha = 1
  ctx.fillText(data.player.space_info.avatar_count, 343, 154)
  ctx.restore()

  ctx.save()
  ctx.beginPath()
  ctx.globalAlpha = 0.7
  ctx.drawImage(achieveIcon, 415, 130, 30, 30)
  ctx.font = `25px "Rubik SemiBold"`
  ctx.fillStyle = "#fff"
  ctx.textAlign = "start"
  ctx.globalAlpha = 1
  ctx.fillText(data.player.space_info.achievement_count, 453, 154)
  ctx.restore()

  let columnAttr = 0;
  let attrIcon;
  ctx.save()
  for(let i = 0; i < attrFix.length; i++) {
    const attr = attrFix[i]
    const rgb = i % 2 == 0 ? "0, 0, 0" : "20, 20, 20"
    attrIcon = await loadImage(`./assets/icons/attributes/${attr.icon}`)
    ctx.beginPath()
    ctx.fillStyle = `rgba(${rgb}, .8)`
    ctx.roundRect(20, 475 + columnAttr, 650, 70, 10)
    ctx.fill()
    ctx.drawImage(attrIcon, 35, 485 + columnAttr, 45, 45)
    ctx.font = `35px "Rubik SemiBold"`
    ctx.fillStyle = "#fff"
    ctx.textAlign = "start"
    ctx.fillText(attr.name, 90, 520 + columnAttr)
    ctx.textAlign = "end"

    let attrVal;

    if(!attr.hasOwnProperty("addition") && attr.hasOwnProperty("attribute")) {
      ctx.fillText(attr.attrDisplay, 655, 505 + columnAttr)

    } else if(attr.hasOwnProperty("addition") && attr.hasOwnProperty("attribute")) {
      if(attr.percent) {
        attrVal = `${Math.floor((attr.attribute + attr.addition)*100*10)/10}%`;
      } else {
        attrVal = parseInt(attr.attribute + attr.addition)
      }
      ctx.fillText(attrVal, 655, 505 + columnAttr)

    } else {
      if(attr.percent) {
        attrVal = `${Math.floor(attr.addition*100*10)/10}%`
      } else {
        attrVal = attr.addedDispaly
      }
      ctx.fillText(attrVal, 655, 505 + columnAttr)
    }

    ctx.font = `25px "Rubik Light"`

    if(!attr.hasOwnProperty("addition") && attr.hasOwnProperty("attribute")) {
      ctx.fillText(attr.attrDisplay, 655, 535 + columnAttr)

    } else if(attr.hasOwnProperty("addition") && attr.hasOwnProperty("attribute")) {
      ctx.fillText(attr.attrDisplay, 638 - ctx.measureText(attr.addedDispaly).width, 535 + columnAttr)
    }

    if(attr.hasOwnProperty("addition")) {
      ctx.fillStyle = "#0ddb25"
      ctx.fillText("+" + attr.addedDispaly, 655, 535 + columnAttr)
    }

    columnAttr += 80
  }
  ctx.restore()

  let betweenXSkill = 0;
  let betweenYSkill = 0;
  const charSL = character.skills.length;
  const charSLSlice = (charSL > 6) ? 5 : charSL;
  const skillIconPosX = character.relics.length === 0 ? 115 : 920;

  ctx.save()
  for(let i = 0; i < charSL; i += charSLSlice) {
    const skillSlice = character.skills.slice(i, i + charSLSlice)

    for(let n = 0; n < skillSlice.length; n++ ) {
      const skill = skillSlice[n]
      if(skill.name !== skill.id) {
        const charId = character.id.toString()
          .replace("8002", "8001")
          .replace("8004", "8003")
        const skillType = skill.type
          .replace("BPSkill", "BP")
          .replace("Talent", "Passive")
        const skillIconFile = `SkillIcon_${charId}_${skillType}.png`
        const skillIcon = await loadImage(`./assets/icons/skills/${skillIconFile}`)

        ctx.save()
        ctx.beginPath()
        ctx.arc(canvasW - (skillIconPosX + betweenXSkill), 115 + betweenYSkill, 85, 0, Math.PI * 2, false)
        ctx.fillStyle = "rgba(0, 0, 0, .8)"
        ctx.fill()
        ctx.clip()

        ctx.beginPath()
        ctx.drawImage(skillIcon, canvasW - (skillIconPosX + 75 + betweenXSkill), 40 + betweenYSkill, 150, 150)
        ctx.fillStyle = "rgba(0, 0, 0, 1)"
        ctx.rect(canvasW - (190 + betweenXSkill), 160 + betweenYSkill, 150, 40)
        ctx.fill()
        ctx.closePath()
        ctx.restore()

        ctx.beginPath()
        ctx.arc(canvasW - (skillIconPosX + betweenXSkill), 115 + betweenYSkill, 87, 0, Math.PI * 2, false)
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 5
        ctx.stroke()
        ctx.font = `30px "Rubik SemiBold"`
        ctx.fillStyle = "#fff"
        ctx.textAlign = "start"
        ctx.fillText("+" + skill.level, canvasW - (skillIconPosX + 15 + betweenXSkill) - (10 * skill.level.toString().length - 10), 190 + betweenYSkill)

        ctx.font = `35px "Rubik SemiBold"`
        ctx.fillStyle = "#fff"
        ctx.textAlign = "center"
        ctx.strokeStyle = "#000"
        ctx.lineWidth = 5;
        ctx.strokeText(skill.type_text, canvasW - (skillIconPosX + betweenXSkill), 240 + betweenYSkill)
        ctx.fillText(skill.type_text, canvasW - (skillIconPosX + betweenXSkill), 240 + betweenYSkill)

        betweenYSkill += 250;
      }
    }

    betweenXSkill += 200;
    betweenYSkill = 0;
    betweenYSkill += 100;
  }

  let columnRelic = 0;
  for(let i = 0; i < character.relics.length; i++) {
    const relicData = character.relics[i]

    const relicIconFilename = relicData.icon.split("/").at(-1)
    const relicIcon = await loadImage(`./assets/relics/${relicIconFilename}`)

    const MAIconFile = relicData.main_affix.icon.split("/").at(-1)
    const relicMAIcon = await loadImage(`./assets/icons/attributes/${MAIconFile}`)

    const relicSA = relicData.sub_affix

    // no overflow the content of a column
    ctx.save()
    ctx.beginPath()
    ctx.fillStyle = 'rgba(0, 0, 0, .8)'
    ctx.roundRect(canvasW - 800, 20 + columnRelic, 780, 200, 20)
    ctx.fill()
    ctx.clip()

    ctx.drawImage(relicMAIcon, canvasW - 550, 40 + columnRelic, 80, 80)

    ctx.font = `30px "Rubik Light"`
    ctx.fillStyle = "#fff"
    ctx.textAlign = "start"

    let betweenXSA = 0;
    let betweenYSA = 0;

    for(let i = 0; i < relicSA.length; i += 2) {
      const relicSlice = relicSA.slice(i, i + 2)

      for(let n = 0; n < relicSlice.length; n++ ) {
        const relic = relicSlice[n]
        const SAIconFile = relic.icon.split("/").at(-1)
        const SAIconImg = await loadImage(`./assets/icons/attributes/${SAIconFile}`)

        ctx.drawImage(SAIconImg, (canvasW - 410) + betweenXSA, 40 + columnRelic + betweenYSA, 45, 45)
        ctx.fillText("+" + relic.display, (canvasW - 360) + betweenXSA, 73 + columnRelic + betweenYSA)

        betweenXSA += 195
      }

      betweenXSA = 0
      betweenYSA += 95
    }

    ctx.font = `40px "Rubik Medium"`
    ctx.textAlign = "center"
    ctx.fillText("+" + relicData.main_affix.display, canvasW - 510, 175 + columnRelic)
    ctx.restore()

    // no overflow for the relic icon on the left side
    ctx.save()
    ctx.beginPath()

    let gradient = ctx.createLinearGradient(200, 70 + columnRelic, 215, 320 + columnRelic);
    for(let i = 0; i < rarityFrame[relicData.rarity].length; i++) {
      const relicRarity = rarityFrame[relicData.rarity][i];
      gradient.addColorStop(relicRarity.offset, relicRarity.color);

    }
    ctx.fillStyle = gradient;
    ctx.roundRect(canvasW - 800, 20 + columnRelic, 200, 200, 20)
    ctx.fill()
    ctx.clip()
    ctx.drawImage(relicIcon, canvasW - 775, 40 + columnRelic, 150, 150)

    // no overflow for the relic level
    ctx.beginPath()
    const relicLvl = relicData.level
    ctx.fillStyle = "rgba(0, 0, 0, .8)"
    ctx.roundRect(canvasW - 660 - (20 * `${relicLvl.toString()}`.length) + 5, 160 + columnRelic, 150, 80, 20)
    ctx.fill()
    ctx.clip()
    ctx.font = `40px "Rubik Medium"`
    ctx.fillStyle = "#fff"
    ctx.textAlign = "end"
    ctx.fillText("+" + relicLvl, canvasW - 610, 205 + columnRelic)
    ctx.restore()

    columnRelic += 220
  }

  // Skill Tree - WIP
  // ctx.save()
  // ctx.beginPath()
  // ctx.fillStyle = "rgba(0, 0, 0, .8)"
  // ctx.roundRect(560, 10, 430, 430, 20)
  // ctx.fill()
  // ctx.drawImage(pathModel, 580, 30, 400, 400)
  // ctx.restore()

  ctx.textAlign = "start"
  ctx.fillStyle = elementColor[character.element.name][0]
  ctx.font = `50px "Rubik Light"`
  ctx.fillText("Lv. ", 65, canvasH-106)
  ctx.font = `80px "Rubik SemiBold"`
  ctx.fillText(character.level, 35 + 100, canvasH-104)
  ctx.fillStyle = elementColor[character.element.name][1]
  ctx.font = `50px "Rubik Light"`
  ctx.fillText("Lv. ", 63, canvasH-108)
  ctx.font = `80px "Rubik SemiBold"`
  ctx.fillText(character.level, 30 + 100, canvasH-107)
  ctx.fillStyle = "#fff"
  ctx.font = `50px "Rubik Light"`
  ctx.fillText("Lv. ", 61, canvasH-110)
  ctx.font = `80px "Rubik SemiBold"`
  ctx.fillText(character.level, 25 + 100, canvasH-110)

  ctx.drawImage(pathIcon, 300, canvasH-185, 100, 100)
  ctx.drawImage(elemIcon, 430, canvasH-185, 100, 100)

  const charName = (character.id.toString().substring(0,1) === "8" ?
    "Trailblazer" : character.name) + ` | E${character.rank}`
  ctx.font = `120px "Rubik SemiBold"`
  ctx.textAlign = "center"
  ctx.fillStyle = elementColor[character.element.name][0]
  ctx.fillText(charName, (canvasW/2)-90, canvasH-60)
  ctx.fillStyle = elementColor[character.element.name][1]
  ctx.fillText(charName, (canvasW/2)-95, canvasH-65)
  ctx.fillStyle = "#fff"
  ctx.fillText(charName, (canvasW/2)-100, canvasH-70)

  ctx.font = `25px "Rubik SemiBoldItalic"`
  ctx.fillStyle = "#fff"
  ctx.textAlign = "start"
  ctx.globalAlpha = .5
  ctx.fillText("Generated by Telegram ", 20, canvasH-20)
  ctx.globalAlpha = 1
  ctx.fillText("@silverwolffbot", 310, canvasH-20)

  ctx.font = `25px "Rubik SemiBoldItalic"`
  ctx.fillStyle = "#fff"
  ctx.textAlign = "end"
  ctx.globalAlpha = .5
  ctx.fillText("Made in ", canvasW-245, canvasH-20)
  ctx.globalAlpha = 1
  ctx.fillText("Canvas NodeJS", canvasW-50, canvasH-20)

  const buffer = canvas.toBuffer("image/png", { quality: 1, compressionLevel: 0, });
  if(options.as_file || options.as_file === "true") {
    const output = `output/${data.player.uid}-${data.player.nickname}.png`
    fs.writeFileSync(output, buffer);
    console.log(`Image saved to \x1b[1m${output}\x1b[0m`)
    process.exit(1);
  }
  process.stdout.write(buffer.toString("base64"));
})();
