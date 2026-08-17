const CargoGenerator = {
    /**
     * Generar cargo profesional
     */
    generar(datos) {
        const {
            expediente = '',
            solicitante = '',
            fecha = '',
            folios = '',
            tipo_servicio = 'Arbitraje',
            asunto = '',
            token = '', // Token temporal para QR
            numero_constancia = '',
            titulo = 'CARGO DE RECEPCIÓN DE SOLICITUD'
        } = datos;

        const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cargo de Solicitud - ${expediente}</title>
    
    <script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>
    
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Arial', 'Helvetica', sans-serif;
            background: #f5f5f5;
            padding: 20px;
            color: #333;
        }

        .cargo-container {
            max-width: 400px;
            width: 400px;
            margin: 0 auto;
            background: white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            opacity: 1 !important;
            filter: none !important;
            animation: none !important;
            transform: none !important;
        }

        .cargo-header {
            background: white;
            padding: 20px 10px 1px 10px;
            text-align: center;
            border-bottom: 3px solid #d4af37;
            position: static !important;
            inset: auto !important;
            transform: none !important;
        }

        .header-logo {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            margin-bottom: 3px;
        }

        .logo-circle {
            width: 90px;
            height: 90px;
            background: #0066cc;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 32px;
            flex-shrink: 0;
        }

        .header-text {
            text-align: left;
            flex: 1;
        }

        .header-text h1 {
            color: #d4af37;
            font-size: 14px;
            font-weight: 700;
            margin-bottom: 3px;
            text-transform: uppercase;
            line-height: 1.3;
        }

        .header-text p {
            color: #C0C0C0;
            font-size: 11px;
            margin: 0;
            line-height: 1.3;
        }

        .titulo-cargo {
            background: white;
            color: #2d2d2d;
            padding: 15px 20px;
            text-align: center;
            font-size: 16px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            
        }

        .subtitulo-cargo {
            background: #f8f9fa;
            color: #2d2d2d;
            padding: 10px 20px;
            text-align: center;
            font-size: 12px;
            font-weight: 600;
        
        }

        .cargo-content {
            padding: 25px 20px;
        }

        .info-item {
            display: flex;
            
            align-items: baseline;
            gap: 10px;
        }

        .info-item:last-child {
            border-bottom: none;
        }

        .info-label {
            font-size: 12px;
            color: #d4af37;
            font-weight: 700;
            min-width: 150px;
            flex-shrink: 0;
        }

        .info-value {
            font-size: 12px;
            color: #333;
            font-weight: 600;
            text-transform: uppercase;
        }

        .cargo-footer {
            background: #f8f9fa;
            padding: 20px;
            border-top: 3px solid #d4af37;
        }

        .qr-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            margin: 15px 0;
        }

        #qrcode {
            padding: 10px;
            background: white;
            border: 2px solid #d4af37;
            border-radius: 4px;
            width: 140px;
            height: 140px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        #qrcode canvas {
            display: none !important;
        }
        
        #qrcode img {
            display: block !important;
            margin: 0 auto;
            width: 120px !important;
            height: 120px !important;
        }

        .qr-label {
            font-size: 11px;
            color: #666;
            text-align: center;
            font-style: italic;
        }

        .footer-text {
            text-align: center;
            margin: 15px 0;
            padding: 12px;
            background: #fff8e7;
            border-radius: 6px;
        }

        .footer-text p {
            color: #2d2d2d;
            font-size: 11px;
            font-style: italic;
            margin: 0;
            line-height: 1.5;
        }

        .contact-info {
            text-align: center;
            font-size: 9px;
            color: #666;
            line-height: 1.5;
            margin-top: 12px;
        }

        .contact-info p {
            margin: 4px 0;
        }
    </style>
</head>
<body>
    <div id="cargo-recepcion" class="cargo-container">
        <div class="cargo-header">
            <div class="header-logo">
                <img src="assets/img/logo-cargo-2.png" alt="Logo" style="width: 100px; height: auto;">
                <div class="header-text">
                    <h1> Centro de Arbitraje & Dispute Boards</h1>
                    <p>Tmarc</p>
                </div>
            </div>
        </div>

        <div class="titulo-cargo">
            ${titulo}
        </div>
        
        <div class="subtitulo-cargo">
            Mesa de Partes Virtual | Expediente N° ${expediente}
        </div>

        <div class="cargo-content">
            <div class="info-item">
                <div class="info-label">Expediente:</div>
                <div class="info-value">${expediente}</div>
            </div>
            ${numero_constancia ? `<div class="info-item"><div class="info-label">Constancia:</div><div class="info-value">${numero_constancia}</div></div>` : ''}
            <div class="info-item">
                <div class="info-label">Solicitante:</div>
                <div class="info-value">${solicitante || 'No especificado'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Servicio:</div>
                <div class="info-value">${tipo_servicio}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Asunto:</div>
                <div class="info-value">${asunto}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Fecha de presentación:</div>
                <div class="info-value">${fecha}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Total de folios:</div>
                <div class="info-value">${folios}</div>
            </div>
        </div>

        <div class="cargo-footer">
            <div class="qr-container">
                <div id="qrcode"></div>
                <div class="qr-label">Escanea para verificar tu expediente</div>
            </div>
            
            <div class="footer-text">
                <p><strong>Tmarc Centro de Arbitraje & Dispute Boards,</strong> garantía de un arbitraje eficiente y transparente</p>
            </div>
            
            <div class="contact-info">
                <p><strong>${datos.direccion || 'Av. Jose Pardo N° 510 DPTO 203 URB. SANTA CRUZ, Lima - Lima - Miraflores'}</strong></p>
                <p>Central Telefónica: ${datos.telefono || '(044) - 538899'} | Celular: ${datos.celular || '+51 968 183 889 - 967 735 960'}</p>
                <p>Email: ${datos.email || 'sistema@tmarc.pe'} | Web: ${datos.web || 'https://sistema.tmarc.pe'}</p>
            </div>
        </div>
    </div>

    <script>
        // URL con token temporal para acceso directo sin login
        const qrData = '${token 
            ? `https://sistema.tmarc.pe/seguimiento.html?codigo=${expediente}&token=${token}` 
            : `https://sistema.tmarc.pe/seguimiento.html?codigo=${expediente}`}';
        
        new QRCode(document.getElementById("qrcode"), {
            text: qrData,
            width: 120,
            height: 120,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.M
        });
    </script>
</body>
</html>`;

        return html;
    },

    /**
     * Descargar cargo como imagen PNG
     * REQUIERE: html2canvas cargado en la página principal
     */
    async descargar(datos) {
        // Verificar html2canvas
        if (typeof html2canvas === 'undefined') {
            console.error('❌ html2canvas no disponible');
            alert('Error: Debes incluir html2canvas en tu HTML:\n<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>');
            return;
        }

        try {
            const html = this.generar(datos);
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            tempDiv.style.position = 'absolute';
            tempDiv.style.left = '-9999px';
            tempDiv.style.top = '0';
            tempDiv.style.opacity = '1';
            tempDiv.style.filter = 'none';
            tempDiv.style.animation = 'none';
            tempDiv.style.transform = 'none';
            document.body.appendChild(tempDiv);

            // Ejecutar script QR
            const scripts = tempDiv.querySelectorAll('script');
            for (let script of scripts) {
                try {
                    eval(script.textContent);
                } catch (e) {
                    console.warn('Script warning:', e);
                }
            }

            // Esperar generación de QR
            await new Promise(resolve => setTimeout(resolve, 1000));

            const element = tempDiv.querySelector('#cargo-recepcion');
            
            if (!element) {
                throw new Error('Contenedor no encontrado');
            }

            // Forzar dimensiones
            element.style.width = '400px';
            element.style.maxWidth = '400px';
            element.style.minWidth = '400px';
            element.style.background = 'white';
            element.style.setProperty('opacity', '1', 'important');
            element.style.setProperty('filter', 'none', 'important');
            element.style.setProperty('animation', 'none', 'important');
            element.style.setProperty('transform', 'none', 'important');

            // Generar canvas con alta calidad
            const canvas = await html2canvas(element, {
                scale: 3, // Mayor calidad
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false,
                imageTimeout: 0,
                removeContainer: false,
                width: 400,
                windowWidth: 400,
                onclone: (clonedDocument) => {
                    const clonedCargo = clonedDocument.querySelector('#cargo-recepcion');
                    if (clonedCargo) {
                        clonedCargo.style.setProperty('opacity', '1', 'important');
                        clonedCargo.style.setProperty('filter', 'none', 'important');
                        clonedCargo.style.setProperty('animation', 'none', 'important');
                        clonedCargo.style.setProperty('transform', 'none', 'important');
                    }
                }
            });

            // Descargar como PNG
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `Cargo-${datos.numero_constancia || datos.expediente || 'Solicitud'}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                console.log('✅ PNG generado');
            }, 'image/png', 1.0);

            // Limpiar
            await new Promise(resolve => setTimeout(resolve, 500));
            document.body.removeChild(tempDiv);

        } catch (error) {
            console.error('❌ Error:', error);
            alert('Error al generar imagen: ' + error.message);
        }
    },

    /**
     * Imprimir cargo
     */
    imprimir(datos) {
        const html = this.generar(datos);
        const ventana = window.open('', '_blank');
        ventana.document.write(html);
        ventana.document.close();
        ventana.onload = function() {
            setTimeout(() => {
                ventana.print();
            }, 500);
        };
    }
};

// Exportar
if (typeof window !== 'undefined') {
    window.CargoGenerator = CargoGenerator;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CargoGenerator;
}
