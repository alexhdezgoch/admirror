import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, company, adSpend } = body;

    // Validate required fields
    if (!name || !email || !company || !adSpend) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if Supabase is configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      // In development without Supabase, just log and return success
      console.log('Lead submission (Supabase not configured):', {
        name,
        email,
        company,
        adSpend,
        submittedAt: new Date().toISOString(),
      });
      return NextResponse.json({ success: true });
    }

    // Create Supabase admin client for inserting leads
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Insert lead into database
    const { error } = await supabase.from('leads').insert({
      name,
      email,
      company,
      ad_spend: adSpend,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Error inserting lead:', error);
      return NextResponse.json(
        { error: 'Failed to submit form' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing lead submission:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
