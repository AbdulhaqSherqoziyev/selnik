const productsDiv = document.getElementById("products");
const previewDiv = document.getElementById("preview");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let logoImg = null;
let previews = [];

// Logo load (aspect ratio saqlanadi)
logoInput.onchange = e => {
  const img = new Image();
  img.onload = () => logoImg = img;
  img.src = URL.createObjectURL(e.target.files[0]);
};

// Add product
function addProduct() {
  const div = document.createElement("div");
  div.className = "product";
  div.innerHTML = `
    <input placeholder="Mahsulot nomi">
    <input type="number" placeholder="Narxi (so'm)">
  `;
  productsDiv.appendChild(div);
}
addProduct();

// Generate all senniks (preview only)
function generateAll() {
  previewDiv.innerHTML = "";
  previews = [];

  document.querySelectorAll(".product").forEach((p, i) => {
    const name = p.children[0].value;
    const price = Number(p.children[1].value);
    if (!name || !price) return;

    const img = drawSennik(name, price);
    previews.push(img);

    const card = document.createElement("div");
    card.className = "preview-card";
    card.innerHTML = `
      <img src="${img}">
      <button onclick="downloadOne(${i})">⬇️ Yuklab olish</button>
    `;
    previewDiv.appendChild(card);
  });
}

// Premium sennik design
function drawSennik(name, price) {
  const W = 900, H = 600;
  ctx.clearRect(0,0,W,H);

  // background
  ctx.fillStyle = "#f3f4f6";
  ctx.fillRect(0,0,W,H);

  // card
  ctx.fillStyle = "#fff";
  ctx.shadowColor = "rgba(0,0,0,0.12)";
  ctx.shadowBlur = 30;
  ctx.fillRect(40,40,820,520);
  ctx.shadowBlur = 0;

  // header
  let headerY = 90;
  if (logoImg) {
    const maxH = 70;
    const ratio = logoImg.width / logoImg.height;
    const h = maxH;
    const w = h * ratio;
    ctx.drawImage(logoImg, 70, headerY - h/2, w, h);
    ctx.font = "bold 28px Inter, Arial";
    ctx.fillStyle = "#111";
    ctx.fillText(companyName.value, 70 + w + 20, headerY + 10);
  } else {
    ctx.font = "bold 30px Inter, Arial";
    ctx.fillText(companyName.value, 70, headerY);
  }

  // product
  ctx.font = "bold 34px Inter, Arial";
  ctx.fillText(name, 100, 180);

  // price badge
  const priceText = `${price.toLocaleString()} so'm`;
  ctx.font = "bold 22px Inter, Arial";
  const tw = ctx.measureText(priceText).width;
  ctx.fillStyle = "#eef2ff";
  ctx.fillRect(100, 200, tw + 40, 46);
  ctx.fillStyle = "#4338ca";
  ctx.fillText(priceText, 120, 232);

  // table
  const months = document.querySelectorAll(".months");
  const percents = document.querySelectorAll(".percent");

  let y = 300;
  ctx.font = "bold 20px Inter, Arial";
  ctx.fillStyle = "#111";
  ctx.fillText("Muddat", 160, y - 30);
  ctx.fillText("Oyiga to‘lov", 520, y - 30);

  ctx.font = "20px Inter, Arial";

  months.forEach((m,i)=>{
    const total = price * (1 + percents[i].value / 100);
    const monthly = Math.round(total / m.value);

    ctx.fillStyle = i % 2 === 0 ? "#f9fafb" : "#ffffff";
    ctx.fillRect(120, y - 22, 620, 44);

    ctx.fillStyle = "#111";
    ctx.fillText(`${m.value} oy`, 160, y + 5);
    ctx.fillText(`${monthly.toLocaleString()} so'm / oy`, 520, y + 5);

    y += 52;
  });

  // footer
  ctx.font = "14px Inter, Arial";
  ctx.fillStyle = "#9ca3af";
  ctx.fillText("Nasiya shartlari do‘kon tomonidan belgilanadi", 100, 520);

  return canvas.toDataURL("image/png");
}

// Download one
function downloadOne(i) {
  const a = document.createElement("a");
  a.href = previews[i];
  a.download = `sennik_${i+1}.png`;
  a.click();
}

// Download all ZIP
async function downloadAllZip() {
  const zip = new JSZip();
  previews.forEach((img,i)=>{
    zip.file(`sennik_${i+1}.png`, img.split(",")[1], {base64:true});
  });
  const blob = await zip.generateAsync({type:"blob"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "senniklar.zip";
  a.click();
}
