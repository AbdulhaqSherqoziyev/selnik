function generate() {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  const name = document.getElementById("productName").value;
  const price = Number(document.getElementById("price").value);

  const monthsEls = document.querySelectorAll(".months");
  const percentEls = document.querySelectorAll(".percent");

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Card
  ctx.fillStyle = "#f9fafb";
  ctx.fillRect(40, 30, 820, 540);

  // Title
  ctx.fillStyle = "#111";
  ctx.font = "bold 36px Arial";
  ctx.fillText("NASIYA SENNIK", 300, 90);

  // Product
  ctx.font = "bold 26px Arial";
  ctx.fillText(name, 100, 150);

  ctx.font = "22px Arial";
  ctx.fillStyle = "#444";
  ctx.fillText(`Narxi: ${price.toLocaleString()} so'm`, 100, 190);

  // Headers
  ctx.font = "bold 22px Arial";
  ctx.fillStyle = "#000";
  ctx.fillText("Muddat", 120, 260);
  ctx.fillText("Foiz", 380, 260);
  ctx.fillText("Oyiga", 600, 260);

  let y = 310;
  ctx.font = "22px Arial";

  monthsEls.forEach((m, i) => {
    const months = Number(m.value);
    const percent = Number(percentEls[i].value);

    const total = price * (1 + percent / 100);
    const monthly = Math.round(total / months);

    ctx.fillStyle = "#222";
    ctx.fillText(`${months} oy`, 120, y);
    ctx.fillText(`${percent}%`, 380, y);
    ctx.fillText(`${monthly.toLocaleString()} so'm`, 600, y);

    y += 55;
  });

  // Footer
  ctx.font = "16px Arial";
  ctx.fillStyle = "#777";
  ctx.fillText("© Nasiya Sennik Generator", 330, 540);

  // Auto download
  const link = document.createElement("a");
  link.download = "sennik.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}
