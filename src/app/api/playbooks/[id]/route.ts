import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: { id: string };
}

// GET /api/playbooks/[id] - Get a specific playbook
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // Fetch the playbook
    const { data: playbook, error } = await supabase
      .from('playbooks')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !playbook) {
      return NextResponse.json(
        { success: false, error: 'Playbook not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      playbook,
    });
  } catch (error) {
    console.error('Error fetching playbook:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/playbooks/[id] - Delete a playbook
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

    // Delete the playbook
    const { error } = await supabase
      .from('playbooks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to delete playbook:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete playbook' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error deleting playbook:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
