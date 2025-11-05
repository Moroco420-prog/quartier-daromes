"""
Script pour vérifier et corriger les chemins d'images des produits
"""
import sqlite3
import os

def check_and_fix_images():
    db_path = 'database/quartier.db'
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Récupérer tous les produits
        cursor.execute("SELECT id, name, image_url FROM products")
        products = cursor.fetchall()
        
        print("="*80)
        print("VÉRIFICATION DES IMAGES PRODUITS")
        print("="*80)
        
        fixed_count = 0
        
        for product_id, name, image_url in products:
            print(f"\nProduit #{product_id}: {name}")
            print(f"  Image URL actuelle: {image_url}")
            
            if image_url:
                # Vérifier si l'image commence déjà par 'uploads/'
                if image_url.startswith('uploads/'):
                    # Extraire juste le nom du fichier
                    filename = image_url.replace('uploads/', '')
                    print(f"  ✅ Correction: {filename}")
                    cursor.execute("UPDATE products SET image_url = ? WHERE id = ?", (filename, product_id))
                    fixed_count += 1
                elif image_url.startswith('static/uploads/'):
                    # Extraire juste le nom du fichier
                    filename = image_url.replace('static/uploads/', '')
                    print(f"  ✅ Correction: {filename}")
                    cursor.execute("UPDATE products SET image_url = ? WHERE id = ?", (filename, product_id))
                    fixed_count += 1
                else:
                    # Vérifier si le fichier existe
                    full_path = os.path.join('static', 'uploads', image_url)
                    if os.path.exists(full_path):
                        print(f"  ✓ Fichier existe: {full_path}")
                    else:
                        print(f"  ⚠️ Fichier introuvable: {full_path}")
            else:
                print(f"  ℹ️ Pas d'image")
        
        if fixed_count > 0:
            conn.commit()
            print(f"\n✅ {fixed_count} chemins d'image corrigés!")
        else:
            print("\n✓ Tous les chemins d'image sont corrects")
        
        print("="*80)
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    check_and_fix_images()
