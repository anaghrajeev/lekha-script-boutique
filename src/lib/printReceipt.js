/**
 * Utility to print receipts cleanly to thermal printers via a dedicated hidden iframe.
 * Isolates the receipt DOM from any single-page application CSS, CSS variables,
 * flex containers, or viewport scaling, ensuring high-contrast pure black binary output.
 */
export const printThermalReceipt = (elementId = 'print-receipt') => {
  const sourceEl = document.getElementById(elementId);
  if (!sourceEl) {
    window.print();
    return;
  }

  // Remove existing print iframe if any
  const existingIframe = document.getElementById('thermal-print-frame');
  if (existingIframe) {
    existingIframe.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'thermal-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Receipt</title>
        <style>
          @page {
            margin: 0;
            size: auto;
          }
          * {
            box-sizing: border-box !important;
            color: #000000 !important;
            background-color: transparent !important;
            background-image: none !important;
            box-shadow: none !important;
            text-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            -webkit-font-smoothing: none !important;
            -moz-osx-font-smoothing: grayscale !important;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff !important;
          }
          body {
            box-sizing: border-box !important;
            width: 68mm;
            max-width: 68mm;
            margin: 0 0 0 1mm;
            padding: 2mm 1mm;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12px;
            font-weight: 700;
            line-height: 1.35;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 11.5px !important;
            font-weight: 700 !important;
          }
          th, td {
            color: #000000 !important;
            padding: 3px 4px !important;
          }
          th:first-child, td:first-child {
            padding-left: 0 !important;
          }
          th:last-child, td:last-child {
            padding-right: 4px !important;
          }
          b, strong, th {
            font-weight: 900 !important;
          }
          h1 {
            font-family: Arial, Helvetica, sans-serif !important;
            font-size: 24px !important;
            font-weight: 900 !important;
            margin: 4px 0 !important;
            text-align: center !important;
            letter-spacing: 0.5px !important;
            -webkit-text-stroke: 0.5px #000000 !important;
          }
          img, svg {
            filter: grayscale(100%) contrast(1000%) !important;
            image-rendering: pixelated !important;
            image-rendering: -webkit-optimize-contrast !important;
            max-width: 100% !important;
          }
          div[style*="border"] {
            border-color: #000000 !important;
          }
          div[style*="justify-content: space-between"],
          div[style*="justifyContent: space-between"] {
            padding-right: 4px !important;
          }
        </style>
      </head>
      <body>
        ${sourceEl.innerHTML}
      </body>
    </html>
  `);
  doc.close();

  const triggerPrint = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.error('Print iframe error:', e);
      window.print();
    }
  };

  const images = Array.from(doc.images || []);
  if (images.length === 0) {
    // If no images, trigger after a tiny 40ms tick to let DOM layout settle
    setTimeout(triggerPrint, 40);
  } else {
    let printed = false;
    const safePrint = () => {
      if (printed) return;
      printed = true;
      triggerPrint();
    };

    const imagePromises = images.map(img => {
      if (img.complete && img.naturalWidth > 0) {
        return img.decode ? img.decode().catch(() => {}) : Promise.resolve();
      }
      return new Promise(resolve => {
        img.onload = () => {
          if (img.decode) {
            img.decode().catch(() => {}).finally(resolve);
          } else {
            resolve();
          }
        };
        img.onerror = resolve;
      });
    });

    Promise.all(imagePromises).then(() => {
      // Images fully decoded and ready to render
      setTimeout(safePrint, 20);
    });

    // Fallback safety timeout so printing is never delayed or blocked
    setTimeout(safePrint, 350);
  }
};
