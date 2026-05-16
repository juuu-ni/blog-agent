import { Router } from 'express';
import supabase from '../lib/supabase.js';

const router = Router();

// POST /api/drafts — 임시저장 (upsert)
router.post('/', async (req, res) => {
  const userId = req.session.user.id;
  const {
    isTemplateMode, placeInfo,
    topic, mustInclude,
    blogTitle, storeName, location, phone, hours, instagram,
    menuPrices, tplMustInclude, menuRatings,
  } = req.body;

  const { error } = await supabase
    .from('draft_posts')
    .upsert({
      user_id: userId,
      is_template_mode: !!isTemplateMode,
      place_info: placeInfo || null,
      topic: topic || null,
      must_include: mustInclude || null,
      blog_title: blogTitle || null,
      store_name: storeName || null,
      store_location: location || null,
      phone: phone || null,
      hours: hours || null,
      instagram: instagram || null,
      menu_prices: menuPrices || null,
      tpl_must_include: tplMustInclude || null,
      menu_ratings: menuRatings || [],
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) {
    console.error('[drafts] upsert error:', error);
    return res.status(500).json({ error: '임시저장에 실패했습니다.' });
  }
  res.json({ success: true });
});

// GET /api/drafts — 임시저장 조회
router.get('/', async (req, res) => {
  const userId = req.session.user.id;

  const { data, error } = await supabase
    .from('draft_posts')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[drafts] select error:', error);
    return res.status(500).json({ error: '임시저장 불러오기에 실패했습니다.' });
  }
  res.json(data || null);
});

// DELETE /api/drafts — 임시저장 삭제
router.delete('/', async (req, res) => {
  const userId = req.session.user.id;

  const { error } = await supabase
    .from('draft_posts')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('[drafts] delete error:', error);
    return res.status(500).json({ error: '임시저장 삭제에 실패했습니다.' });
  }
  res.json({ success: true });
});

export default router;
