# 03 — Rancangan Data Model

Basis: skema Prisma di `web/prisma/schema.prisma` (Aplikasi Penjualan TC). Konvensi yang **sudah dipakai** dan dilanjutkan:
id `BigInt` autoincrement, nama tabel & kolom **bahasa Inggris snake_case**, uang `Decimal(15,2)` (tampil rupiah bulat),
`created_at/updated_at Timestamp(0)`, `created_by` → `users.id`. Tabel baru mengikuti konvensi yang sama.
Ini **rancangan**, bukan migrasi final — sesuaikan setelah membaca skema & kode yang ada. Semua migrasi aditif;
yang destruktif wajib izin Rama (lihat CLAUDE.md).

Legenda: **[ADA]** tabel sudah ada · **[+]** tambah kolom · **[BARU]** tabel baru · 🔒 = hanya Owner & Accounting (lihat §10).

---

## 1. Tabel yang sudah ada (ringkas)

`customers`, `products`, `quotations`, `quotation_items` (parent_id untuk kelompok, is_compliment, charge_service,
charge_pb1, day, pax), `quotation_event_dates`, `quotation_charges`, `quotation_costs`, `invoices` (+revision,
po_reference), `invoice_items`, `invoice_event_dates`, `invoice_charges`, `invoice_costs`, `invoice_margins`,
`payments` (+pph23), `payment_details` (alokasi), `company_settings`, `signatories`, `users` (role, username,
lockout), `role_permissions` (role × menu_key). Peran saat ini: admin, sales, finance, cost.

## 2. Pengguna & organisasi

- `users` [+]: `phone`, `photo_url`, `pin_hash` (login HP tim), `division_id`, `employment_type` (`tetap|freelance|dw`), `access_expires_at` (DW), `is_field` (tampilan PWA).
- `divisions` [BARU]: kantor_finance, kantor_sales, kantor_bizdev, kantor_ops, dapur_masak, dapur_pastry, captain, driver, gudang, direksi, owner.
- Peran baru di `role_permissions`: `owner`, `direksi`, `accounting`(=finance), `sales`, `bizdev`, `admin`, `kepala_dapur`, `dapur`, `captain`, `field`, `driver`, `gudang`, `dw`. Tambah kolom `capability` untuk izin non-menu (mis. `view_cost`, `approve_low_margin`, `approve_purchase`).
- `push_subscriptions` [BARU]: user_id, endpoint, p256dh, auth, user_agent, created_at (pola Tetra Ops).
- `notifications` [BARU]: user_id, kind, title, body, link, read_at, created_at.
- `audit_log` [BARU]: user_id, action, entity_type, entity_id, payload jsonb, created_at.

## 3. Bahan, resep, HPP

- `ingredients` [BARU]: code (Gcs-001…), category (Groceries/Packaging/Spices/Vegetable & Fruit/Meat/Pastry/Non Halal/Retail), name, brand, variant, purchase_qty, purchase_unit, usage_unit, usage_qty_per_pack, is_packaging, min_stock, status (`ok|lengkapi|cek_konversi`), notes.
- `ingredient_prices` 🔒 [BARU]: ingredient_id, supplier_id?, price_per_pack, price_per_usage_unit, source (`impor|pembelian|manual`), source_ref, effective_at. Harga aktif = terbaru.
- `recipes` [BARU]: menu_id, portions_per_batch, status (`standar|perkiraan|belum_ada`), notes, updated_by.
- `recipe_lines` [BARU]: recipe_id, ingredient_id, qty_per_batch, usage_unit, sort.
- `menu_costs` 🔒 [BARU, bisa view/materialized]: menu_id, material_cost_per_portion, overhead_pct, hpp_per_portion, computed_at.

## 4. Menu, paket, penyajian, pricelist

- `menus` [BARU] (pengganti bertahap `products` untuk makanan): code (MC1-001…), name, category (soup/rice/beef/chicken/fish/seafood/vegetable/appetizer/side/dessert/fruit/snack/beverage/condiment/stall/pasta/…), kitchen (`masak|pastry`), is_vegetarian, photo_url, description, active.
- `service_forms` [BARU]: box_reguler, box_sedang, box_premium, snack_box, buffet, stall, plated, tumpeng, tampah, hampers + `packaging_cost` 🔒 per porsi (box Rp5.805 / sedang Rp6.605 / premium Rp6.305–6.705 dari file).
- `packages` [BARU]: code (BS-15, PR-23, VOW-02, WED-300…), name, kind (`fixed|choice|bundle`), default_service_form_id, description, active.
- `package_items` [BARU] (fixed): package_id, menu_id, qty, sort, note ("pilihan *").
- `package_slots` [BARU] (choice): package_id, category, pick_count (mis. 1 soup, 2 dessert), sort; `package_slot_options`: slot_id, menu_id.
- `package_bundle_lines` [BARU] (bundle wedding): package_id, line_type (buffet/vip/stall), pax, ref_package_id/menu_id.
- `pricelists` [BARU]: code (01–18), name, segment, region (`bogor|jakarta|all`), venue, price_basis (`nett|plus_plus`), prices_include_tax bool, valid_from, valid_to, status (`draft|aktif|arsip`), version, seasonal bool, slug.
- `pricelist_items` [BARU]: pricelist_id, package_id? / menu_id?, unit (pax/box/porsi/ekor/loyang/set/paket), price, min_qty, note.
- `pricelist_files` [BARU]: pricelist_id, version, file_url (asli), file_url_light (kompres), pages, size_bytes, uploaded_by, change_note, is_active, needs_update bool.
- `pricelist_sends` [BARU]: pricelist_id, file_id, customer_id/lead_id, sent_by (user/hermes), sent_at.

## 5. CRM

- `customers` [+]: `type` (`pribadi|corporate|instansi|rekanan|venue`), `region`, `source`, `referrer_customer_id` (rekanan), `notes`.
- `leads` [BARU]: customer_id?, name, phone, source, event_type, event_date, location, pax, service_form, budget, stage (`tanya|quotation|dp|test_food|final|berjalan|selesai|batal`), lost_reason, owner_user_id, last_contact_at, next_followup_at, chat_summary.
- `lead_activities` [BARU]: lead_id, kind (chat/telepon/kirim_pl/kirim_quo/catatan), body, by, at.

## 6. Quotation & dokumen

- `quotations` [+]: `number_new`, `revision` (int), `parent_quotation_id` (revisi), `pricelist_id`, `region`, `customer_type`, `layanan_mode` (`persen_min|set_menu|flat_hari|manual|none`), `layanan_pct`, `layanan_min`, `layanan_flat_per_day`, `layanan_amount`, `delivery_mode`, `delivery_amount` [ADA], `ppn_amount`, `rounding_amount`, `approval_status` (`draft|menunggu_owner|siap_kirim|terkirim|disetujui|ditolak`), `client_approval_method` (`wa|telepon|tanda_tangan|link`), `client_approved_at`, `client_approval_proof_url`, `signed_doc_url`, `referrer_commission_pct` (3,5), `margin_pct` 🔒, `hpp_total` 🔒.
- `quotation_sessions` [BARU]: quotation_id, event_date, start_time, label (Breakfast/Coffee Break/Lunch/Dinner/Stall), location_note, sort.
- `quotation_items` [+]: `session_id`, `package_id`, `menu_id`, `service_form_id`, `tax_type` (`pbjt|ppn|none`), `swapped_from_menu_id`, `price_overridden` bool, `hpp_per_unit` 🔒, `item_type` (`food|equipment_rental|staff|delivery|other`).
- `quotation_versions` [BARU]: quotation_id, revision, snapshot jsonb, diff jsonb, created_by, created_at.
- `invoices` [+]: `number_new`, `term_type` (`booking|dp|pelunasan|penuh`), `term_pct`, `received_by_client_at`, `ppn_amount`, `faktur_pajak_no`, `stamp_duty_required` bool.
- `receipts` (kwitansi) [BARU]: number, payment_id, invoice_id, amount, amount_words, received_from, for_payment, stamp_duty_required, pdf_url.
- `notas` [BARU], `basts` [BARU]: number, event_id/invoice_id, signed_by_name, signature_url / photo_url, signed_at.
- `document_sequences` [BARU]: doc_type, yymm, last_no (dipakai fungsi penomoran dengan lock).
- `terms_templates` [BARU]: service_kind (`buffet_stall|box|set_menu|umum`), version, body_markdown, active.

## 7. Event & operasional

- `events` [BARU]: quotation_id, invoice_id?, customer_id, name, status (`dp|final|terkunci|berjalan|selesai|batal`), service_mode (`antar|ambil|setup_service`), venue, address, maps_url, pic_name, pic_phone, eo_name, guest_count, lock_at, notes.
- `event_days` [BARU]: event_id, date. `event_schedules` [BARU]: event_day_id, arrive_time / ready_time / pickup_time, label, location_note.
- `event_items` [BARU]: schedule_id, menu_id/package_id, qty, unit, service_form_id, packaging_note (box coklat 12x12/26x20, stiker logo), choice_notes, kitchen (`masak|pastry`), vendor_note (mis. MEY Bakery), diet (`regular|vegetarian`), kitchen_note.
- `event_changes` [BARU]: event_id, change_no, summary, diff jsonb, approved_by, created_at (sumber brief "UPDATE ke-n").
- `vehicles` [BARU]: name (Luxio, Grand Max), plate, capacity, active.
- `assignments` [BARU]: event_id, kloter (1,2,…), depart_time, vehicle_id, user_id, role (`captain_pic|driver|steward|delivery_lauk|crew|dw`), task_note (ambil bunga), confirmed_at ("Siap 👍").
- `driver_tasks` [BARU]: non-event (antar/jemput), driver_id, vehicle_id, date, depart_time, note.
- `event_equipment_needs` [BARU]: event_id, item_id, qty, note (pemanas VIP, bunga reuse).
- `cook_sessions` [BARU]: event_id, kitchen, start_at, pack_at, ready_at, depart_at, edited_by.
- `order_tracking` [BARU]: event_id, schedule_id?, kloter?, status (`dimasak|packing|siap|berangkat|tiba|diambil|dokumen_diterima`), by_user, at, lat, lng, photo_urls jsonb, receiver_name, voice_note_url, client_ref_id (anti-dobel).
- `briefs` [BARU]: event_id?, date?, kind (`konfirmasi|preinfo|update|jadwal_service|persiapan_besok|driver`), target (`grup_kitchen|grup_captain|dapur_masak|dapur_pastry|…`), body_text, version, status (`draft|antre|terkirim|gagal`), sent_at, idempotency_key UNIQUE (pola `crew_briefings` Tetra Ops).
- `brief_acks` [BARU]: brief_id, user_id, acked_at.
- `bot_commands` [BARU]: command (`send-group|send-dm|send-doc`), payload jsonb, status (`pending|done|failed`), attempts, created_at (antrian ke Hermes/worker WA, pola Tetra Ops).
- `kitchen_displays` [BARU]: name (Dapur Masak/Pastry), kitchen filter, power_on_offset_min, power_off_offset_min, smart_plug_ref.

## 8. Purchasing & gudang

- `suppliers` [BARU]: name, category, contact, phone, payment_term_days (0 = cash), bank_account, notes, active.
- `supplier_prices` 🔒 [BARU]: supplier_id, ingredient_id, price_per_pack, pack_size, pack_unit, is_primary, effective_at (riwayat).
- `purchase_requests` [BARU]: number (PR/TC/…), event_ids (relasi `pr_events`), status (`draft|diajukan|disetujui|sebagian|selesai|batal`), estimated_total 🔒, approved_by (Finance), approved_at, transfer_amount, notes.
- `purchase_request_items` [BARU]: pr_id, ingredient_id, qty_needed, qty_from_stock, qty_to_buy, unit, est_price 🔒, received_qty, event_id (alokasi).
- `purchase_orders` [BARU] (supplier tempo): number, supplier_id, pr_id, status, due_date, total 🔒.
- `purchases` [BARU] (penerimaan/GR + belanja pasar): number, supplier_id?, pr_id?, po_id?, purchased_at, payment_method (`cash_uang_muka|transfer|tempo`), total 🔒, receipt_urls jsonb, no_receipt_reason, received_by, status.
- `purchase_items` [BARU]: purchase_id, ingredient_id, qty, unit_input, qty_usage_unit (hasil konversi), unit_cost 🔒, total 🔒, pr_item_id, event_id.
- `cash_advances` [BARU] (Daily Market): kind (`topup|belanja|pengembalian`), holder_user_id (Pak Sur), amount, bank_account?, event_id?, purchase_id?, receipt_urls, note, status (`posted|reversed`). Saldo per pemegang = Σ.
- `supplier_payables` [BARU] (hutang dagang): purchase_id, due_date, paid_at, paid_amount.
- `stock_movements` [BARU]: ingredient_id, qty (+/−, satuan pakai), kind (`pembelian|pemakaian_event|opname_adj|waste|retur`), ref_type, ref_id, unit_cost_snapshot 🔒, at, by.
- `stock_opname_sessions` / `stock_opname_lines` [BARU] (pola Mahakan): period_label, status (`berjalan|diajukan|final|batal`), counted_by, expected_qty, actual_qty, diff, reason (wajib bila |diff| > 5%), unit_cost_snapshot 🔒. Partial unique index: satu sesi `berjalan` per gudang.
- `equipment_items` [BARU]: name, category (penghangat/piring/gelas/alat saji/meja & taplak/dekor/lainnya), owned_qty, condition, location, photo_url, replacement_price (tabel S&K), qr_code?.
- `equipment_movements` [BARU]: item_id, event_id, kind (`keluar|kembali|rusak|hilang|sewa_masuk|sewa_kembali`), qty, by, at, note, vendor_id? (alat sewaan), cost 🔒.

## 9. Keuangan tambahan

- `referral_commissions` [BARU]: event_id/quotation_id, referrer_customer_id, base_amount (F&B), pct (3,5), amount, status (`terhutang|dibayar`), paid_at.
- `crew_fees` [BARU]: event_id, user_id / dw_name, dw_phone, role, employment_type, hours_in, hours_out, fee_amount, approved_by, paid_at, transfer_proof_url.
- `refunds` [BARU]: event_id, cancelled_at, days_before, refund_pct, refund_amount, credit_valid_until.
- Event cost roll-up: bahan (purchases/stock), honor, sewa alat vendor, komisi → `invoice_costs`/laporan margin yang sudah ada.

## 10. Keamanan data rahasia (wajib, pola Tetra Ops `inventory_items_safe`)

- Kolom 🔒 disimpan di tabel/kolom yang **tidak terbaca** oleh peran selain Owner & Accounting.
- Karena aplikasi memakai Prisma lewat server (bukan Supabase client di browser), penegakan utama di **lapisan server**: semua query untuk peran non-owner melewati fungsi/`select` yang **tidak menyertakan** kolom 🔒; komponen client tidak pernah menerima props berisi kolom 🔒. Tambahkan juga **RLS / view aman** bila ada akses Supabase langsung (PWA realtime, storage).
- Brief, layar dapur, PWA tim, PDF lembar dapur, dan tool Hermes untuk tim **tidak pernah** memuat harga beli/HPP/untung (harga jual pun tidak untuk dapur/lapangan).
- Test otomatis: render halaman tiap peran → pastikan string HPP/harga beli tidak muncul di payload.

## 11. Impor data awal

| Sumber | Ke tabel | Catatan |
|---|---|---|
| `data/bahan.csv` (977) | ingredients + ingredient_prices | status "Lengkapi harga/konversi" → `lengkapi` |
| `data/resep.csv` (5.999 baris, 588 resep) | menus + recipes + recipe_lines | 610 di Daftar Menu; 22 belum terbaca parser → cek manual |
| `data/daftar_menu_hpp_lama.csv` | pembanding HPP lama (validasi) | HPP lama = bahan × 1,3 |
| `data/pricelist_menu_hpp_lama.csv` (563) | kategori & nama menu, harga jual bila ada | |
| `data/paket_box_hpp.csv` | packages + package_items (sumber "BS-PR terbaru" = aktif) | versi lama → arsip harga |
| `data/pricelist-teks/*.txt` | pricelists + pricelist_items (semi-manual, dibantu skrip + verifikasi Rama) | dua versi "02 Menu Bogor" |
Semua impor: skrip **DRY-RUN** → ringkasan (jumlah baris, contoh, anomali) → Rama "jalankan" → `--apply` satu transaksi.
