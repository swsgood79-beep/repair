import type { Customer, ItemDef } from '../types';
import { lamp } from './lamp';
import { fan } from './fan';
import { radio } from './radio';
import { cassette } from './cassette';
import { clock } from './clock';
import { iron } from './iron';
import { phone } from './phone';
import { ricecooker } from './ricecooker';
import { amp } from './amp';
import { turntable } from './turntable';
import { sewing } from './sewing';
import { tv } from './tv';
import { calc } from './calc';

export const ITEMS: ItemDef[] = [lamp, fan, radio, cassette, clock, iron, phone, ricecooker, amp, turntable, sewing, tv, calc];

export function item(id: string): ItemDef {
  const found = ITEMS.find(i => i.id === id);
  if (!found) throw new Error('unknown item ' + id);
  return found;
}

export const CUSTOMERS: Customer[] = [
  { name: '세탁소 오씨', hair: '#2b2622', skin: '#d8a982', shirt: '#4f6f8f', style: 0, hello: '할아버지 솜씨 닮았나 보자고.', thanks: '역시 이 집이야!', angry: '그대로잖아!' },
  { name: '복덕방 할머니', hair: '#c9c4bb', skin: '#e0b48f', shirt: '#9b5a6a', style: 1, hello: '영감이 쓰던 거라 못 버려.', thanks: '아이고, 고마워라.', angry: '아직 안 되네…' },
  { name: '대학생 수진', hair: '#3b2a1e', skin: '#f0c7a2', shirt: '#d9a441', style: 2, hello: '중고로 샀는데 이상해요.', thanks: '새것 같아요!', angry: '음… 그대로인데요?' },
  { name: '정육점 박사장', hair: '#1c1c1c', skin: '#c99272', shirt: '#b34a3b', style: 3, hello: '가게용이라 빨리 좀!', thanks: '좋아, 수고했어!', angry: '이러면 곤란하지!' },
  { name: '분식집 이모', hair: '#5a3b2a', skin: '#e7b893', shirt: '#e08a5a', style: 1, hello: '애들이 쓰다가 이렇게 됐어요.', thanks: '떡볶이 먹으러 와요!', angry: '아직 안 되네요.' },
  { name: '골동품상 문선생', hair: '#8c8c8c', skin: '#d6a77e', shirt: '#3e4a3a', style: 0, hello: '원래 부품을 살려 주시오.', thanks: '손이 정직하구먼.', angry: '고친 게 아니지 않소.' },
  { name: '경비 아저씨', hair: '#2f2f2f', skin: '#c48f6a', shirt: '#4b5b3b', style: 3, hello: '야간에 꼭 필요해요.', thanks: '오늘 밤은 든든하네요.', angry: '어… 아직 안 돼요.' },
  { name: '꽃집 사장', hair: '#6b3a2a', skin: '#efc29e', shirt: '#6aa07a', style: 2, hello: '손님 물건이라 부탁드려요.', thanks: '깔끔하네요!', angry: '손님한테 뭐라 하죠…' },
  { name: '철물점 강씨', hair: '#2a2a2a', skin: '#b98563', shirt: '#7a6a4f', style: 3, hello: '나도 봤는데 모르겠어.', thanks: '어디가 문제였어?', angry: '내가 봐도 아직이네.' },
  { name: '이발소 할아버지', hair: '#e8e8e8', skin: '#d9a37c', shirt: '#e8e2d0', style: 0, hello: '네 할아버지 장기 친구다.', thanks: '허허, 그 손 그대로구나.', angry: '서두르지 말거라.' },
];
