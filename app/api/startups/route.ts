import {NextResponse} from 'next/server';
import {startups} from '../../../lib/data';
export async function GET(){return NextResponse.json({items:startups,updatedAt:new Date().toISOString(),source:'StartupPulse demo dataset'});}
