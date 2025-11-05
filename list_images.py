"""
Script pour lister toutes les images uploadées et les produits associés
"""
import sqlite3
import os
from PIL import Image

def list_images_and_products():
    db_path = 'database/quartier.db'
    uploads_dir = 'static/uploads'
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("="*80)
        print("LISTE DES PRODUITS ET LEURS IMAGES")
        print("="*80)
        
        # Récupérer tous les produits avec images
        cursor.execute("SELECT id, name, image_url, brand FROM products WHERE image_url IS NOT NULL")
        products = cursor.fetchall()
        
        for product_id, name, image_url, brand in products:
            print(f"\n📦 Produit #{product_id}: {name}")
            print(f"   Marque: {brand}")
            print(f"   Image: {image_url}")
            
            # Vérifier le fichier
            image_path = os.path.join(uploads_dir, image_url)
            if os.path.exists(image_path):
                try:
                    img = Image.open(image_path)
                    width, height = img.size
                    print(f"   ✅ Fichier existe: {width}x{height}px, Format: {img.format}")
                    img.close()
                except Exception as e:
                    print(f"   ⚠️ Erreur ouverture image: {e}")
            else:
                print(f"   ❌ Fichier introuvable: {image_path}")
        
        print("\n" + "="*80)
        print("FICHIERS DANS LE DOSSIER UPLOADS")
        print("="*80)
        
        if os.path.exists(uploads_dir):
            files = os.listdir(uploads_dir)
            print(f"\nTotal: {len(files)} fichiers\n")
            for f in sorted(files):
                full_path = os.path.join(uploads_dir, f)
                size = os.path.getsize(full_path)
                print(f"  📄 {f} ({size:,} bytes)")
        else:
            print("⚠️ Dossier uploads introuvable!")
        
        print("="*80)
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
    finally:
        conn.close()

if __name__ == '__main__':
    list_images_and_products()
