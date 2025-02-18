"use client";
import React, { useEffect, useRef, useState } from "react";

const Page = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [groupedObjects, setGroupedObjects] = useState([]);

  const startCamera = () => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error("Kamera erişimi hatası:", err);
      });
  };

  const groupObjects = (objects) => {
    const grouped = [];
    const minDistance = 75; // Nesneler arasındaki mesafe (bu değeri değiştirerek hassasiyeti artırabilirsiniz)

    objects.forEach((obj) => {
      let added = false;

      for (let group of grouped) {
        if (
          Math.abs(obj.x - group.avgX) < minDistance &&
          Math.abs(obj.y - group.avgY) < minDistance
        ) {
          group.points.push(obj);
          group.avgX =
            group.points.reduce((sum, p) => sum + p.x, 0) / group.points.length;
          group.avgY =
            group.points.reduce((sum, p) => sum + p.y, 0) / group.points.length;
          added = true;
          break;
        }
      }

      if (!added) {
        grouped.push({ points: [obj], avgX: obj.x, avgY: obj.y });
      }
    });

    // Gruplar için sınırları ve boyutları belirle
    return grouped.map((group) => {
      const minX = Math.min(...group.points.map((p) => p.x));
      const maxX = Math.max(...group.points.map((p) => p.x));
      const minY = Math.min(...group.points.map((p) => p.y));
      const maxY = Math.max(...group.points.map((p) => p.y));
      return {
        minX,
        maxX,
        minY,
        maxY,
        width: maxX - minX,
        height: maxY - minY,
      };
    });
  };

  const detectColorsObjects = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Canvas'tan piksel verilerini al
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Mavi nesneleri işaretlemek için koordinatlar
    const objects = [];

    // Piksel verilerini incele
    for (let i = 0; i < data.length; i += 4) {
      const red = data[i]; // Kırmızı kanal
      const green = data[i + 1]; // Yeşil kanal
      const blue = data[i + 2]; // Mavi kanal

      // Mavi rengin belirli aralıklarda olup olmadığını kontrol et
      // Bu aralık, kırmızı ve yeşilden mavi rengin daha baskın olduğu pikselleri hedef alır
      if (blue > 100 && red < 70 && green < 70) {
        const x = (i / 4) % canvas.width;
        const y = Math.floor(i / 4 / canvas.width);

        // Küçük nesneleri filtrelemek için pixel yoğunluğu kontrolü
        objects.push({ x, y });
      }
    }

    // Birleştirilen mavi nesneleri tespit etmek için yoğunluk bazlı grup oluşturma
    const groupedObjects = groupObjects(objects);
    setGroupedObjects(groupedObjects);
    // Tespit edilen mavi nesneleri işaretlemek için dikdörtgenler çiz
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Her seferinde eski çizimleri temizle
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height); // Video görüntüsünü yeniden çiz

    groupedObjects.forEach((group) => {
      // Koordinatları belirleyerek dikdörtgen çiz
      ctx.beginPath();
      ctx.rect(
        group.minX - 10,
        group.minY - 10,
        group.width + 20,
        group.height + 20
      ); // Nesne etrafında dikdörtgen çiz
      ctx.strokeStyle = "red"; // Kırmızı renk ile işaretle
      ctx.lineWidth = 2;
      ctx.stroke();

      const centerX = group.minX + group.width / 2;
      const centerY = group.minY + group.height / 2;

      // Merkez noktasını işaretle (Yeşil renkli artı işareti)
      ctx.beginPath();

      // Yatay çizgi (Artının yatay kısmı)
      ctx.moveTo(centerX - 50, centerY);
      ctx.lineTo(centerX + 50, centerY);

      // Dikey çizgi (Artının dikey kısmı)
      ctx.moveTo(centerX, centerY - 50);
      ctx.lineTo(centerX, centerY + 50);

      // Çizimi tamamla
      ctx.strokeStyle = "green"; // Artı işaretini yeşil renkle işaretle
      ctx.lineWidth = 1; // Çizginin kalınlığı
      ctx.stroke();
    });
    requestAnimationFrame(detectColorsObjects);
  };

  useEffect(() => {
    startCamera();
    const requestId = requestAnimationFrame(detectColorsObjects);
    return () => cancelAnimationFrame(requestId);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <video
        ref={videoRef}
        autoPlay
        width={640}
        height={480}
        className="hidden"
      />
      <canvas ref={canvasRef} width={640} height={480} />
      <div>
        {groupedObjects.map((group, index) => (
          <div key={index}>
            <p>
              Nesne {index + 1}: X: {group.minX + group.width / 2}, Y:{" "}
              {group.minY + group.height / 2}, Genişlik: {group.width},
              Yükseklik: {group.height}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Page;
