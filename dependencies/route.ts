import { NextRequest, NextResponse } from 'next/server';
import { S3Connection } from '@/lib/s3Connection';

export async function POST(request: NextRequest) {
  try {
    const { accessKey, secretKey, region } = await request.json();
    
    // Validate input
    if (!accessKey || !secretKey) {
      return NextResponse.json(
        { error: 'AWS credentials are required' },
        { status: 400 }
      );
    }
    
    // Initialize S3 connection
    const s3Connection = new S3Connection();
    const connected = s3Connection.connect({
      accessKey,
      secretKey,
      region: region || 'us-east-1'
    });
    
    if (!connected) {
      return NextResponse.json(
        { error: 'Failed to connect to AWS S3' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error connecting to S3:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
