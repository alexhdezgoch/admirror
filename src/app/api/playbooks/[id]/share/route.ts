import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PlaybookShareRequest, PlaybookShareResponse } from '@/types/playbook';

interface RouteParams {
  params: { id: string };
}

// POST /api/playbooks/[id]/share - Enable/update sharing
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id } = params;
    const body: PlaybookShareRequest = await request.json();
    const { isPublic, expiresInDays } = body;

    // Calculate expiration date if provided
    let shareExpiresAt: string | null = null;
    if (expiresInDays && expiresInDays > 0) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + expiresInDays);
      shareExpiresAt = expirationDate.toISOString();
    }

    // Update the playbook
    const { data: playbook, error } = await supabase
      .from('playbooks')
      .update({
        is_public: isPublic,
        share_expires_at: shareExpiresAt,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('share_token')
      .single();

    if (error || !playbook) {
      console.error('Failed to update share settings:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update share settings' },
        { status: 500 }
      );
    }

    // Build the share URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const shareUrl = isPublic ? `${baseUrl}/playbook/${playbook.share_token}` : undefined;

    const response: PlaybookShareResponse = {
      success: true,
      shareUrl,
      shareToken: isPublic ? playbook.share_token : undefined,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating share settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/playbooks/[id]/share - Disable sharing
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id } = params;

    // Disable sharing
    const { error } = await supabase
      .from('playbooks')
      .update({
        is_public: false,
        share_expires_at: null,
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to disable sharing:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to disable sharing' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error disabling sharing:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
