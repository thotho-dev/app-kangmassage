-- Trigger untuk otomatisasi saldo terapis saat pesanan selesai
CREATE OR REPLACE FUNCTION handle_order_completion()
RETURNS TRIGGER AS $$
DECLARE
    net_amount DECIMAL(12,2);
    comm_amount DECIMAL(12,2);
    t_balance_before DECIMAL(12,2);
BEGIN
    -- Hanya jalan jika status berubah menjadi 'completed'
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        
        -- Hitung pembagian (80% untuk terapis, 20% komisi platform)
        comm_amount := NEW.total_price * 0.20;
        net_amount := NEW.total_price - comm_amount;

        -- Ambil saldo sebelum untuk pencatatan transaksi
        SELECT wallet_balance INTO t_balance_before FROM therapists WHERE id = NEW.therapist_id;

        -- 1. Update saldo terapis
        UPDATE therapists 
        SET wallet_balance = wallet_balance + net_amount,
            total_orders = total_orders + 1,
            updated_at = NOW()
        WHERE id = NEW.therapist_id;

        -- 2. Catat riwayat transaksi
        INSERT INTO transactions (
            therapist_id, 
            order_id, 
            type, 
            amount, 
            balance_before, 
            balance_after, 
            description,
            created_at
        )
        VALUES (
            NEW.therapist_id,
            NEW.id,
            'credit',
            net_amount,
            t_balance_before,
            t_balance_before + net_amount,
            'Pendapatan pesanan #' || NEW.order_number,
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Hapus trigger jika sudah ada untuk menghindari duplikasi
DROP TRIGGER IF EXISTS on_order_completed ON orders;

CREATE TRIGGER on_order_completed
AFTER UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION handle_order_completion();
