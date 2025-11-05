"""
Script de migration pour ajouter la colonne 'reason' à la table loyalty_transactions
"""
import sqlite3
from datetime import datetime

def migrate_database():
    db_path = 'database/quartier.db'
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Vérifier si la colonne 'reason' existe déjà
        cursor.execute("PRAGMA table_info(loyalty_transactions)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'reason' in columns:
            print("✅ La colonne 'reason' existe déjà dans la table loyalty_transactions")
            return
        
        print("🔧 Ajout de la colonne 'reason' à la table loyalty_transactions...")
        
        # Ajouter la colonne 'reason'
        cursor.execute("""
            ALTER TABLE loyalty_transactions 
            ADD COLUMN reason VARCHAR(200)
        """)
        
        conn.commit()
        print("✅ Colonne 'reason' ajoutée avec succès!")
        
        # Afficher la structure mise à jour
        cursor.execute("PRAGMA table_info(loyalty_transactions)")
        print("\n📋 Structure actuelle de la table loyalty_transactions:")
        for column in cursor.fetchall():
            print(f"  - {column[1]} ({column[2]})")
        
    except Exception as e:
        print(f"❌ Erreur lors de la migration: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    print("="*60)
    print("MIGRATION BASE DE DONNÉES - LOYALTY TRANSACTIONS")
    print("="*60)
    migrate_database()
    print("="*60)
