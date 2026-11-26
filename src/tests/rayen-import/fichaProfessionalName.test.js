import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

Function(readFileSync('extension/hhr-ficha-professional-name.js', 'utf8'))();
const { short } = globalThis.HhrFichaProfessionalName;

describe('nombre corto de un profesional', () => {
  it('lee los cuatro campos de Eloísa por sus espacios: un campo vacío deja el suyo', () => {
    // Sin segundo nombre: dos espacios tras el primero.
    expect(short('Daniel  Opazo Damiani')).toBe('Daniel Opazo');
    expect(short('Camila  Leiva Bascur')).toBe('Camila Leiva');
    // Sin segundo nombre ni segundo apellido.
    expect(short('Janet  Pastene ')).toBe('Janet Pastene');
    expect(short('Diego  Hidalgo')).toBe('Diego Hidalgo');
    // Los cuatro campos.
    expect(short('María José Pérez Soto')).toBe('María Pérez');
    // Con segundo nombre y sin segundo apellido: queda un espacio al final.
    expect(short('Ana María Rojas ')).toBe('Ana Rojas');
  });

  it('lee un nombre escrito sin el campo del segundo nombre, como en «Solicitante»', () => {
    expect(short('Daniel Opazo Damiani')).toBe('Daniel Opazo');
    expect(short('Diego Hidalgo ')).toBe('Diego Hidalgo');
    expect(short('Diego Hidalgo')).toBe('Diego Hidalgo');
  });

  it('conserva entero un apellido compuesto', () => {
    expect(short('Juan  De la Fuente Soto')).toBe('Juan De la Fuente');
    expect(short('Juan De la Fuente')).toBe('Juan De la Fuente');
    expect(short('María José De la Fuente Soto')).toBe('María De la Fuente');
  });

  it('no inventa nada con menos de tres palabras ni con espacios de más', () => {
    expect(short('Ana')).toBe('Ana');
    expect(short('')).toBe('');
    expect(short(undefined)).toBe('');
    expect(short('  Elena  Ejemplo Prueba  ')).toBe('Elena Ejemplo');
    expect(short('Elena\u00a0\u00a0Ejemplo Prueba')).toBe('Elena Ejemplo');
  });
});
