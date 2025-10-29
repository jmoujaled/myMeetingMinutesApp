import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'API is working',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    runtime: 'nodejs'
  });
}

export async function POST() {
  return NextResponse.json({
    status: 'POST endpoint is working',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    runtime: 'nodejs'
  });
}